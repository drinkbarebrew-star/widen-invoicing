"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { renderEstimateHTML, type EstimateData } from "@/lib/estimate";

export interface PreviewHandle {
  print: () => void;
}

const EstimatePreview = forwardRef<PreviewHandle, { data: EstimateData }>(
  function EstimatePreview({ data }, ref) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      const doc = iframe.contentDocument;
      if (!doc) return;
      doc.open();
      doc.write(renderEstimateHTML(data));
      doc.close();
    }, [data]);

    useImperativeHandle(ref, () => ({
      print: () => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentWindow) return;
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      },
    }));

    return (
      <iframe
        ref={iframeRef}
        title="Estimate preview"
        className="w-full bg-white rounded-lg shadow"
        style={{ height: "1100px", border: "1px solid rgba(0,0,0,0.1)" }}
      />
    );
  }
);

export default EstimatePreview;
