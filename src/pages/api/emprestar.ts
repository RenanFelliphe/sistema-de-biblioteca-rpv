import type { NextApiRequest, NextApiResponse } from "next";
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const filePath = path.join(process.cwd(), 'src', 'pages', 'api', 'bd.json');

// 🧠 Interfaces
interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string;
}

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

  const usuarios: Usuario[] = parsed.usuarios || [];
  const livros: Livro[] = parsed.livros || [];
  const emprestimos: Emprestimo[] = parsed.emprestimos || [];

  const { usuarioId, livrosIds } = req.body;

  // 🔴 Validação
  if (!usuarioId || !livrosIds || !Array.isArray(livrosIds)) {
    return res.status(400).json({ mensagem: 'usuarioId e livrosIds são obrigatórios' });
  }

  // 🔍 Usuário existe?
  const usuarioExiste = usuarios.find(u => u.id === usuarioId);
  if (!usuarioExiste) {
    return res.status(404).json({ mensagem: 'Usuário não encontrado' });
  }

  // 🔍 Livros existem?
  const livrosSelecionados = livrosIds.map(id => livros.find(l => l.id === id));

  if (livrosSelecionados.some(l => !l)) {
    return res.status(404).json({ mensagem: 'Um ou mais livros não existem' });
  }

  // 🔴 Verificar disponibilidade
  for (let livro of livrosSelecionados) {
    if (livro && livro.quantidade <= livro.qtdEmprestados) {
      return res.status(400).json({
        mensagem: `Livro "${livro.titulo}" sem unidades disponíveis`
      });
    }
  }

  // 🆕 Criar empréstimo
  const novoEmprestimo: Emprestimo = {
    id: uuidv4(),
    usuarioId,
    livrosIds,
    status: 'ativo',
    data: new Date().toISOString()
  };

  // 🔄 Atualizar livros
  livrosIds.forEach(id => {
    const livro = livros.find(l => l.id === id);
    if (livro) {
      livro.qtdEmprestados += 1;
    }
  });

  // 💾 Salvar
  emprestimos.push(novoEmprestimo);

  fs.writeFileSync(
    filePath,
    JSON.stringify({ ...parsed, livros, emprestimos }, null, 2)
  );

  return res.status(200).json({
    mensagem: 'Empréstimo realizado com sucesso!',
    emprestimo: novoEmprestimo
  });
}