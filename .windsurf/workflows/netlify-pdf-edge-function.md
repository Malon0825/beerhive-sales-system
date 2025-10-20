---
description: Alternative solution - Move PDF generation to Netlify Edge Function
---

# Move PDF Generation to Netlify Edge Function

If the main fixes don't work, this is an alternative approach to completely isolate PDF generation.

## Why This Works
- Edge Functions have separate size limits (50MB vs 10MB)
- Deployed to Deno runtime (lighter than Node.js)
- Completely separate from main Next.js server handler

## Steps

### 1. Create Edge Function Directory
```bash
mkdir -p netlify/edge-functions
```

### 2. Create PDF Edge Function
**File:** `netlify/edge-functions/generate-pdf.ts`

```typescript
import { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");
  
  if (!orderId) {
    return new Response("Missing orderId", { status: 400 });
  }

  try {
    // Fetch order data from your API
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const orderResponse = await fetch(`${apiUrl}/api/orders/${orderId}`);
    const orderData = await orderResponse.json();

    // For PDF generation, proxy to a dedicated serverless function
    // or use a PDF service like PDFShift, DocRaptor, etc.
    const pdfResponse = await fetch(`${apiUrl}/api/orders/${orderId}/receipt?format=pdf`);
    
    if (!pdfResponse.ok) {
      throw new Error("PDF generation failed");
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    
    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="receipt-${orderId}.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return new Response("Internal server error", { status: 500 });
  }
};

export const config = { path: "/api/pdf/receipt" };
```

### 3. Update netlify.toml
```toml
[[edge_functions]]
  function = "generate-pdf"
  path = "/api/pdf/receipt"
```

### 4. Update Frontend Code
Replace references to `/api/orders/[orderId]/receipt?format=pdf` with `/api/pdf/receipt?orderId=[orderId]`

## Pros
- Completely separate from main server bundle
- Better caching at edge locations
- 50MB size limit vs 10MB

## Cons
- More complex architecture
- Requires code changes in frontend
- Limited to Netlify-specific deployment
