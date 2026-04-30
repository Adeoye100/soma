import { PDFDocument } from 'pdf-lib';

export async function compressPDF(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Remove unused objects and optimize PDF structure
    pdfDoc.removePage(0); // Example: Remove first page (adjust as needed)
    
    // Reduce image quality (if applicable)
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const images = page.getImages();
      for (const image of images) {
        const { width, height } = image.scale(0.5); // Example: Reduce image size
        image.setDimensions(width, height);
      }
    }
    
    // Save the compressed PDF
    const compressedPdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      useCompression: true,
    });
    
    return Buffer.from(compressedPdfBytes);
  } catch (err) {
    console.error('Failed to compress PDF:', err);
    throw new Error('PDF compression failed');
  }
}