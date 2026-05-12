// Type declarations for JavaScript libraries without TypeScript support

declare module 'mammoth' {
  interface ConvertToHtmlOptions {
    arrayBuffer?: ArrayBuffer;
    images?: {
      imgElement?: (image: any) => Promise<string | null>;
    };
    styleMap?: string[];
  }

  interface ConvertResult {
    value: string;
    messages: any[];
  }

  export function convertToHtml(options: ConvertToHtmlOptions): Promise<ConvertResult>;
}

declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: {
      type?: string;
      quality?: number;
      format?: string;
      compression?: string;
    };
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      allowTaint?: boolean;
      backgroundColor?: string;
      letterRendering?: boolean;
      logging?: boolean;
    };
    jsPDF?: {
      unit?: string;
      format?: string;
      orientation?: string;
      compress?: boolean;
      putOnlyUsedFonts?: boolean;
      floatPrecision?: number;
    };
    pagebreak?: {
      mode?: string[];
      before?: string;
    };
  }

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf;
    from(element: HTMLElement): Html2Pdf;
    outputPdf(type: 'blob' | 'datauristring' | 'datauri'): Promise<Blob | string>;
  }

  export default function html2pdf(): Html2Pdf;
}

declare module 'pptx2html' {
  export default function pptx2html(arrayBuffer: ArrayBuffer): Promise<string>;
}