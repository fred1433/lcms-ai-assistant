import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const documentsDir = path.join(process.cwd(), 'documents');
    const filenames = await fs.readdir(documentsDir);
    const supportedFiles = filenames.filter(
      (file) => file.endsWith('.pdf') || file.endsWith('.csv') || file.endsWith('.txt')
    );

    const documents = await Promise.all(
      supportedFiles.map(async (filename) => {
        const filePath = path.join(documentsDir, filename);
        let content = '';

        if (filename.endsWith('.pdf')) {
          const dataBuffer = await fs.readFile(filePath);
          const data = await pdf(dataBuffer);
          content = data.text.substring(0, 400000);
        } else {
          content = await fs.readFile(filePath, 'utf-8');
        }

        return {
          name: `Exemple: ${filename}`,
          content: content,
        };
      })
    );

    return NextResponse.json({ documents });

  } catch (error) {
    console.error('Error loading documents:', error);
    return NextResponse.json(
      { error: 'Failed to load technical documents.' },
      { status: 500 }
    );
  }
} 