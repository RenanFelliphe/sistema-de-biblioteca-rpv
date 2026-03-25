import type { NextApiRequest, NextApiResponse } from "next";
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Caminho absoluto para o arquivo de dados
const filePath = path.join(process.cwd(), 'src', 'pages', 'api', 'bd.json');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    type Livro = {
        titulo: string;
        autor: string;
        genero: string;
        quantidade: number;
        qtdEmprestados: number;
        [key: string]: unknown;
    };

    const jsonData = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(jsonData) as { livros?: Livro[] };
    const livros = parsed.livros ?? [];

    const { titulo, autor, genero, quantidade } = req.body;

    if (!titulo || !autor || !genero || !quantidade) {
        return res.status(400).json({ mensagem: 'Todos os campos (titulo, autor, genero, quantidade) são obrigatórios.' });
    }

    const jaExiste = livros.some(
        (livro: Livro) =>
            livro.titulo.trim().toLowerCase() === titulo.trim().toLowerCase() &&
            livro.autor.trim().toLowerCase() === autor.trim().toLowerCase()
    );

    if (jaExiste) {
        return res.status(400).json({ mensagem: 'Livro já cadastrado!' });
    }

    const novoLivro = {
        id: uuidv4(),
        titulo: titulo.trim(),
        autor: autor.trim(),
        genero: genero.trim(),
        quantidade: Number(quantidade),
        qtdEmprestados: 0
    };

    livros.push(novoLivro);
    fs.writeFileSync(filePath, JSON.stringify({ ...parsed, livros }, null, 2));

    res.status(200).json({ mensagem: 'Livro cadastrado com sucesso!', livro: novoLivro });
}