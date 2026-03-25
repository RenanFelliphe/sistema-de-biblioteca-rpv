import type { NextApiRequest, NextApiResponse } from "next";
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Caminho absoluto para o arquivo de dados
const filePath = path.join(process.cwd(), 'src', 'pages', 'api', 'bd.json');

interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const jsonData = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(jsonData);
    const usuarios: Usuario[] = parsed.usuarios || [];

    const { nome, email, telefone } = req.body

    if (!nome || !email || !telefone) {
        return res.status(400).json({ mensagem: 'Nome, email e telefone são obrigatórios.' });
    }

    // verificar se o email já existe
    if (usuarios.some((user) => user.email === email)) {
        return res.status(400).json({ mensagem: 'Usuário já cadastrado com este e-mail!' });
    }

    const novoUsuario = {
        id: uuidv4(),
        nome,
        email,
        telefone
    };

    usuarios.push(novoUsuario);
    fs.writeFileSync(filePath, JSON.stringify({ ...parsed, usuarios }, null, 2));

    res.status(200).json({ mensagem: 'Usuário cadastrado com sucesso!', usuario: novoUsuario });
}