import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import winston from 'winston';

const BASE_URL = 'https://api.ilovepdf.com/v1';
const PUBLIC_KEY = process.env.ILOVEPDF_PUBLIC_KEY!;
const SECRET_KEY = process.env.ILOVEPDF_SECRET_KEY!;

interface TaskResponse {
  server: string;
  task: string;
}

export class ILovePDFService {

  private static async getToken(): Promise<string> {
    try {
      const res = await axios.post(`${BASE_URL}/auth`, {
        public_key: PUBLIC_KEY,
        secret_key: SECRET_KEY,
      }, {
        timeout: 10000 // 10s timeout for auth
      });
      return res.data.token;
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw new Error('iLovePDF authentication failed. Please check ILOVEPDF_PUBLIC_KEY and ILOVEPDF_SECRET_KEY in .env');
      }
      throw err;
    }
  }

  private static async startTask(
    tool: string,
    token: string
  ): Promise<TaskResponse> {
    const res = await axios.get(`${BASE_URL}/start/${tool}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { server: res.data.server, task: res.data.task };
  }

  private static async uploadFile(
    server: string,
    task: string,
    token: string,
    filePath: string,
    fileName: string
  ): Promise<string> {
    const form = new FormData();
    form.append('task', task);
    form.append('file', fs.createReadStream(filePath), fileName);

    const res = await axios.post(`https://${server}/v1/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data.server_filename;
  }

  private static async processTask(
    server: string,
    task: string,
    tool: string,
    token: string,
    serverFilename: string,
    originalName: string
  ): Promise<void> {
    try {
      await axios.post(
        `https://${server}/v1/process`,
        {
          task,
          tool,
          files: [
            {
              server_filename: serverFilename,
              filename: originalName,
            },
          ],
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 60000 // 60s timeout for processing
        }
      );
    } catch (err: any) {
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        throw new Error('Processing timeout. The file may be too large or complex.');
      }
      if (err.response?.status === 400) {
        throw new Error('Request failed with status code 400. File format may be incompatible or corrupted.');
      }
      throw err;
    }
  }

  private static async downloadResult(
    server: string,
    task: string,
    token: string
  ): Promise<Buffer> {
    const res = await axios.get(`https://${server}/v1/download/${task}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
    });
    return Buffer.from(res.data);
  }

  private static extractTextFromZip(zipBuffer: Buffer): string {
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    const textEntry = entries.find((e) => e.entryName.endsWith('.txt'));
    if (!textEntry) {
      throw new Error('No text file found in iLovePDF output');
    }

    return textEntry.getData().toString('utf-8');
  }

  private static async pdfToText(
    filePath: string,
    fileName: string,
    token: string
  ): Promise<string> {
    const { server, task } = await this.startTask('extractpdf', token);

    const serverFilename = await this.uploadFile(
      server,
      task,
      token,
      filePath,
      fileName
    );

    await this.processTask(
      server,
      task,
      'extractpdf',
      token,
      serverFilename,
      fileName
    );

    const zipBuffer = await this.downloadResult(server, task, token);
    return this.extractTextFromZip(zipBuffer);
  }

  private static async officeToPdf(
    filePath: string,
    fileName: string,
    token: string,
    tempDir: string
  ): Promise<string> {
    const { server, task } = await this.startTask('officepdf', token);

    const serverFilename = await this.uploadFile(
      server,
      task,
      token,
      filePath,
      fileName
    );

    await this.processTask(
      server,
      task,
      'officepdf',
      token,
      serverFilename,
      fileName
    );

    const zipBuffer = await this.downloadResult(server, task, token);

    const zip = new AdmZip(zipBuffer);
    const pdfEntry = zip
      .getEntries()
      .find((e) => e.entryName.endsWith('.pdf'));

    if (!pdfEntry) {
      throw new Error('No PDF found in officepdf output');
    }

    const tempPdfPath = path.join(tempDir, `${Date.now()}_converted.pdf`);
    fs.writeFileSync(tempPdfPath, pdfEntry.getData());

    return tempPdfPath;
  }

  /**
   * Extract text from any supported file type using iLovePDF.
   *
   * Supported: .pdf, .docx, .doc, .pptx, .ppt, .xlsx, .xls, .txt, .csv
   */
  static async extractText(
    filePath: string,
    fileName: string,
    mimeType: string
  ): Promise<string> {
    if (!PUBLIC_KEY || !SECRET_KEY) {
      throw new Error(
        'iLovePDF API keys not configured. Set ILOVEPDF_PUBLIC_KEY and ILOVEPDF_SECRET_KEY in .env'
      );
    }

    const token = await this.getToken();
    const tempDir = path.dirname(filePath);
    const ext = path.extname(fileName).toLowerCase();

    if (ext === '.txt' || ext === '.csv') {
      return fs.readFileSync(filePath, 'utf-8');
    }

    if (mimeType === 'application/pdf' || ext === '.pdf') {
      return await this.pdfToText(filePath, fileName, token);
    }

    const officeTypes = [
      '.docx',
      '.doc',
      '.pptx',
      '.ppt',
      '.xlsx',
      '.xls',
    ];

    if (officeTypes.includes(ext)) {
      const tempPdfPath = await this.officeToPdf(
        filePath,
        fileName,
        token,
        tempDir
      );

      try {
        const text = await this.pdfToText(
          tempPdfPath,
          path.basename(tempPdfPath),
          token
        );
        return text;
      } finally {
        if (fs.existsSync(tempPdfPath)) {
          fs.unlinkSync(tempPdfPath);
        }
      }
    }

    throw new Error(`Unsupported file type: ${ext}`);
  }

  /**
   * Extract text from an in-memory buffer (for multer uploads).
   * Writes the buffer to a temp file, processes it, then cleans up.
   */
  static async extractTextFromBuffer(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `${Date.now()}_${fileName}`);
    fs.writeFileSync(tempFilePath, fileBuffer);

    try {
      return await this.extractText(tempFilePath, fileName, mimeType);
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }
}

export default ILovePDFService;
