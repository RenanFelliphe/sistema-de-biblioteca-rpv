import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";

// 🧠 Interfaces
interface Usuario {
  id: string;
  nome: string;
}

interface Livro {
  id: string;
  titulo: string;
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

// 🧠 ZOD
const usuarioSchema = z.object({
  nome: z.string().min(3, "Nome obrigatório"),
  email: z.string().email("Email inválido"),
  telefone: z.string().min(10, "Telefone inválido")
});

const livroSchema = z.object({
  titulo: z.string().min(2, "Título obrigatório"),
  autor: z.string().min(2, "Autor obrigatório"),
  genero: z.string().min(2, "Gênero obrigatório"),
  quantidade: z.string().min(1, "Quantidade obrigatória")
});

type UsuarioForm = z.infer<typeof usuarioSchema>;
type LivroForm = z.infer<typeof livroSchema>;

export default function Home() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [livros, setLivros] = useState<Livro[]>([]);
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);

  const [emprestimoData, setEmprestimoData] = useState({
    usuarioId: "",
    livroId: ""
  });

  const [devolucaoId, setDevolucaoId] = useState("");

  const userForm = useForm<UsuarioForm>({
    resolver: zodResolver(usuarioSchema)
  });

  const bookForm = useForm<LivroForm>({
    resolver: zodResolver(livroSchema)
  });

  async function carregarDados() {
    const u = await (await fetch("/api/list/usuarios")).json();
    const l = await (await fetch("/api/list/livros")).json();
    const e = await (await fetch("/api/list/emprestimos")).json();

    setUsuarios(u.usuarios || []);
    setLivros(l.livros || []);
    setEmprestimos(e.emprestimos || []);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  function formatarData(dataString: string) {
    return new Date(dataString).toLocaleDateString("pt-BR");
  }

  function formatarEmprestimo(e: Emprestimo) {
    const usuario = usuarios.find(u => u.id === e.usuarioId);

    const nome = usuario
      ? usuario.nome.split(" ").slice(0, 2).join(" ")
      : "Usuário desconhecido";

    const titulos = e.livrosIds
      .map(id => livros.find(l => l.id === id)?.titulo)
      .filter(Boolean)
      .join(", ");

    if (e.status === "ativo") {
      return `Emprestado em: ${formatarData(e.data)} | ${nome} | ${titulos}`;
    }

    return `Devolvido em: ${formatarData(e.dataDevolucao || e.data)} | ${nome} | ${titulos}`;
  }

  const emprestimosAtivos = emprestimos.filter(e => e.status === "ativo");
  const emprestimosConcluidos = emprestimos.filter(e => e.status === "concluido");

  async function submitUsuario(data: UsuarioForm) {
    await fetch("/api/create/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    userForm.reset();
    carregarDados();
  }

  async function submitLivro(data: LivroForm) {
    await fetch("/api/create/livros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        quantidade: Number(data.quantidade)
      })
    });

    bookForm.reset();
    carregarDados();
  }

  async function emprestar() {
    if (!emprestimoData.usuarioId || !emprestimoData.livroId) {
      alert("Selecione usuário e livro");
      return;
    }

    await fetch("/api/emprestar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuarioId: emprestimoData.usuarioId,
        livrosIds: [emprestimoData.livroId]
      })
    });

    carregarDados();
  }

  async function devolver() {
    if (!devolucaoId) {
      alert("Selecione um empréstimo");
      return;
    }

    await fetch("/api/devolver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emprestimoId: devolucaoId
      })
    });

    setDevolucaoId("");
    carregarDados();
  }

return (
  <div className="min-h-screen flex flex-col bg-slate-100">
    <header className="fixed top-0 w-full bg-white/70 backdrop-blur-md border-b shadow-sm px-6 h-16 flex items-center justify-between z-10">
      <Link href="/" className="text-xl font-semibold text-green-600">📚 Biblioteca - -</Link>
    </header>

    <main className="flex-1 mt-16 flex flex-col items-center gap-8 px-4 py-10">
      <h1 className="text-5xl font-semibold text-green-700 text-center">Sistema de Biblioteca</h1>
      
      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-lg p-8 flex flex-col gap-5">
      <h1 className="text-2xl font-semibold text-green-700 text-left">Cadastro</h1>
        <div className="grid md:grid-cols-2 gap-8">
          <form onSubmit={userForm.handleSubmit(submitUsuario)} className="flex flex-col gap-3 p-5 rounded-xl">

            <h2 className="font-semibold text-green-600">Adicionar Usuário</h2>

            <label className="text-xs text-slate-500">Nome</label>
            <input {...userForm.register("nome")} className="input"/>

            <label className="text-xs text-slate-500">Email</label>
            <input {...userForm.register("email")} className="input"/>

            <label className="text-xs text-slate-500">Telefone</label>
            <input {...userForm.register("telefone")} className="input"/>

            <button className="btn-primary mt-2">Adicionar</button>
          </form>

          <form onSubmit={bookForm.handleSubmit(submitLivro)} className="flex flex-col gap-3 p-5 rounded-xl">
            <h2 className="font-semibold text-green-600">Adicionar Livro</h2>

            <label className="text-xs text-slate-500">Título</label>
            <input {...bookForm.register("titulo")} className="input"/>

            <label className="text-xs text-slate-500">Autor</label>
            <input {...bookForm.register("autor")} className="input"/>

            <label className="text-xs text-slate-500">Gênero</label>
            <input {...bookForm.register("genero")} className="input"/>

            <label className="text-xs text-slate-500">Quantidade</label>
            <input {...bookForm.register("quantidade")} className="input"/>

            <button className="btn-primary mt-2">Adicionar</button>
          </form>
        </div>
      </div>

      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-lg p-8 flex flex-col gap-5">
        <h1 className="text-2xl font-semibold text-green-700 text-left">Movimentações</h1>
        <div className="flex flex-col gap-3 rounded-xl p-5">
          <h2 className="font-semibold text-green-600">Realizar Empréstimo</h2>

          <label className="text-xs text-slate-500">Usuário</label>
          <select className="input"onChange={e => setEmprestimoData({ ...emprestimoData, usuarioId: e.target.value })}>
            <option value="">Selecione</option>
            {usuarios.map(u => (<option key={u.id} value={u.id}>{u.nome}</option>))}
          </select>

          <label className="text-xs text-slate-500">Livro</label>
          <select className="input" onChange={e => setEmprestimoData({ ...emprestimoData, livroId: e.target.value })}>
            <option value="">Selecione</option>
            {livros.map(l => {
              const disponiveis = l.quantidade - l.qtdEmprestados;
              const esgotado = disponiveis <= 0;

              return (
                <option key={l.id} value={l.id} disabled={esgotado}>
                  {l.titulo} ({disponiveis}/{l.quantidade}) {esgotado ? "- Esgotado" : ""}
                </option>
              );
            })}
          </select>

          <button onClick={emprestar} className="btn-primary mt-2">Emprestar</button>
        </div>

        {emprestimosAtivos.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl p-5">
            <h2 className="font-semibold text-green-600">Realizar Devoluções</h2>

            <select className="input" onChange={e => setDevolucaoId(e.target.value)}>
              <option value="">Selecione</option>
              {emprestimosAtivos.map(e => (<option key={e.id} value={e.id}>{formatarEmprestimo(e)}</option>))}
            </select>

            <button onClick={devolver} className="btn-primary mt-2">Devolver</button>
          </div>
        )}
      </div>

      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-lg p-8 flex flex-col gap-5">
        <h1 className="text-2xl font-semibold text-green-700 text-left">Histórico</h1>

        {emprestimosConcluidos.length > 0 && (
            <div className="flex flex-col gap-3 rounded-xl p-5">
              <h2 className="font-semibold text-green-600">Empréstimos Concluídos</h2>

              <select className="input">
                {emprestimosConcluidos.map(e => (<option key={e.id}>{formatarEmprestimo(e)}</option>))}
              </select>
            </div>
          )}
      </div>
    </main>

    <footer className="w-full py-2 border-t border-green-600 px-6 flex items-center justify-evenly bg-white text-sm text-center py-3 text-slate-500 shadow-sm">
      <p className=""> © {new Date().getFullYear()} UsefulToolsPortal |  Rio Pomba Valley | Todos os direitos reservados.</p>

      <div className="flex items-center gap-6">
          <span className="">Feito por <span className="text-green-500">Renan Felliphe</span></span>
          <a href="https://instagram.com/renan_felliphe11" target="_blank" rel="noopener noreferrer" className="hover:text-green-500 transition-colors duration-300"> Instagram </a>
          <a href="https://www.linkedin.com/in/renan-felliphe-moura-34ab1126a/" target="_blank" rel="noopener noreferrer" className="hover:text-green-500 transition-colors duration-300"> LinkedIn </a>
      </div>
    </footer>
  </div>
);
}