import type { NextApiRequest, NextApiResponse } from "next";
import fs from 'fs';
import path from 'path';

// Caminho absoluto para o arquivo de dados
const filePath = path.join(process.cwd(), 'src', 'pages', 'api', 'bd.json');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    // --- OPERAÇÃO DE LEITURA ---
    const jsonData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(jsonData);

    res.status(200).json({ usuarios: data.usuarios });
}