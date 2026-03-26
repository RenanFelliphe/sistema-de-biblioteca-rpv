import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const filePath = path.join(process.cwd(), "src", "pages", "api", "bd.json");

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  type Livro = {
    id: string
    titulo: string
    autor: string
    genero: string
    quantidade: number
    qtdEmprestados: number
    [key: string]: unknown
  };

  const jsonData = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(jsonData) as { livros?: Livro[] }
  const livros = parsed.livros ?? []

  const { titulo, autor, genero, quantidade } = req.body;

  if (!titulo || !autor || !genero || !quantidade) {
    return res.status(400).json({
      mensagem:
        "Todos os campos (titulo, autor, genero, quantidade) são obrigatórios.",
    });
  }

  const livroExistente = livros.find(
    (livro: Livro) =>
      normalizar(livro.titulo) === normalizar(titulo) &&
      normalizar(livro.autor) === normalizar(autor)
  );

  if (livroExistente) {
    livroExistente.quantidade += Number(quantidade)

    fs.writeFileSync(
      filePath,
      JSON.stringify({ ...parsed, livros }, null, 2)
    );

    return res.status(200).json({
      mensagem: "Quantidade atualizada com sucesso!",
      livro: livroExistente,
    });
  }

  const novoLivro: Livro = {
    id: uuidv4(),
    titulo: titulo.trim(),
    autor: autor.trim(),
    genero: genero.trim(),
    quantidade: Number(quantidade),
    qtdEmprestados: 0,
  };

  livros.push(novoLivro);

  fs.writeFileSync(
    filePath,
    JSON.stringify({ ...parsed, livros }, null, 2)
  );

  return res.status(200).json({
    mensagem: "Livro cadastrado com sucesso!",
    livro: novoLivro,
  });
}