import type { NextApiRequest, NextApiResponse } from "next";
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'pages', 'api', 'bd.json');

// 🧠 Interfaces
interface Livro {
  id: string;
  titulo: string;
  autor: string;
  genero: string;
  quantidade: number;
  qtdEmprestados: number;
}

interface Emprestimo {
  id: string;
  usuarioId: string;
  livrosIds: string[];
  status: string;
  data: string;
  dataDevolucao?: string;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ mensagem: 'Método não permitido' });
  }

  const jsonData = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(jsonData);

  const livros: Livro[] = parsed.livros || [];
  const emprestimos: Emprestimo[] = parsed.emprestimos || [];

  const { emprestimoId } = req.body;

  // 🔴 Validação
  if (!emprestimoId) {
    return res.status(400).json({ mensagem: 'emprestimoId é obrigatório' });
  }

  // 🔍 Buscar empréstimo
  const emprestimo = emprestimos.find(e => e.id === emprestimoId);

  if (!emprestimo) {
    return res.status(404).json({ mensagem: 'Empréstimo não encontrado' });
  }

  // 🔴 Já concluído?
  if (emprestimo.status === 'concluido') {
    return res.status(400).json({ mensagem: 'Empréstimo já foi concluído' });
  }

  // 🔄 Atualizar livros
  emprestimo.livrosIds.forEach(id => {
    const livro = livros.find(l => l.id === id);
    if (livro && livro.qtdEmprestados > 0) {
      livro.qtdEmprestados -= 1;
    }
  });

  // ✅ Atualizar status
  emprestimo.status = 'concluido';
  emprestimo.dataDevolucao = new Date().toISOString();

  // 💾 Salvar
  fs.writeFileSync(
    filePath,
    JSON.stringify({ ...parsed, livros, emprestimos }, null, 2)
  );

  return res.status(200).json({
    mensagem: 'Devolução realizada com sucesso!',
    emprestimo
  });
}