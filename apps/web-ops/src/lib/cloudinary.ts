type CloudinarySignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

export async function uploadImagesToCloudinary(files: File[]) {
  if (!files.length) return [];

  // 1️⃣ Get signature from backend
  const sigRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/uploads/cloudinary-signature`,
    {
      headers: {
        "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_KEY || "",
      },
    }
  );

  if (!sigRes.ok) {
    throw new Error("Failed to get Cloudinary signature");
  }

  const sig: CloudinarySignature = await sigRes.json();

  // 2️⃣ Upload directly to Cloudinary
  const uploads = files.map(async (file, idx) => {
    const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;

    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sig.apiKey);
    form.append("timestamp", String(sig.timestamp));
    form.append("signature", sig.signature);
    form.append("folder", sig.folder);

    const res = await fetch(url, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cloudinary upload failed: ${text}`);
    }

    const json = await res.json();

    return {
      url: json.secure_url as string,
      sortOrder: idx,
      alt: file.name,
    };
  });

  return Promise.all(uploads);
}