import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";

interface Usuario {
  id: string;
  nome: string;
  email: string;
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

const usuarioSchema = z.object({
  nome: z.string().min(3, "Campo obrigatório"),
  email: z.string().min(1, "Campo obrigatório").email("E-mail inválido"),
  telefone: z
    .string()
    .min(1, "Campo obrigatório")
    .max(11, "O telefone é grande demais")
    .regex(/^\d+$/, "O telefone deve ter apenas números")
    .refine((value) => value.length === 11, {
      message: "O telefone deve incluir o DDD (11 dígitos no total)",
    }),
});

const livroSchema = z.object({
  titulo: z.string().min(1, "O título é obrigatório"),
  autor: z.string().min(3, "O autor é obrigatório"),
  genero: z.string().min(5, "O gênero é obrigatório"),
  quantidade: z.number("Quantidade inválida").positive("A quantidade é obrigatória"),
});

const emprestimoSchema = z.object({
  usuarioId: z.string().min(1, "Campo obrigatório"),
  livroId: z.string().min(1, "Campo obrigatório"),
});

const devolucaoSchema = z.object({
  emprestimoId: z.string().min(1, "Campo obrigatório"),
});

type UsuarioForm = z.infer<typeof usuarioSchema>;
type LivroForm = z.infer<typeof livroSchema>;
type EmprestimoForm = z.infer<typeof emprestimoSchema>;
type DevolucaoForm = z.infer<typeof devolucaoSchema>;

export default function Home() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [livros, setLivros] = useState<Livro[]>([]);
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);

  const [livroDuplicado, setLivroDuplicado] = useState<Livro | null>(null);
  const [generoBloqueado, setGeneroBloqueado] = useState(false);

  const {
    register: userRegister,
    handleSubmit: userHandleSubmit,
    formState: { errors: usuarioErrors },
    reset: userReset,
    setError,
  } = useForm<UsuarioForm>({
    resolver: zodResolver(usuarioSchema),
  });

  const {
    register: bookRegister,
    handleSubmit: bookHandleSubmit,
    formState: { errors: livroErrors },
    reset: bookReset,
    watch,
    setValue,
  } = useForm<LivroForm>({
    resolver: zodResolver(livroSchema),
  });

  const {
    register: registerEmprestimo,
    handleSubmit: emprestimoHandleSubmit,
    formState: { errors: emprestimoErrors },
    reset: resetEmprestimo,
  } = useForm<EmprestimoForm>({
    resolver: zodResolver(emprestimoSchema),
  });

  const {
    register: registerDevolucao,
    handleSubmit: devolucaoHandleSubmit,
    formState: { errors: devolucaoErrors },
    reset: resetDevolucao,
  } = useForm<DevolucaoForm>({
    resolver: zodResolver(devolucaoSchema),
  });

  function normalizar(texto: string) {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

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

  useEffect(() => {
    const titulo = watch("titulo") || "";
    const autor = watch("autor") || "";

    if (!titulo || !autor) {
      setLivroDuplicado(null);
      setGeneroBloqueado(false);
      setValue("genero", "");
      return;
    }

    const existente = livros.find(
      (l) =>
        normalizar(l.titulo) === normalizar(titulo) &&
        normalizar(l.autor) === normalizar(autor)
    );

    if (existente) {
      setLivroDuplicado(existente);
      setGeneroBloqueado(true);
      setValue("genero", existente.genero);
    } else {
      setLivroDuplicado(null);
      setGeneroBloqueado(false);
      setValue("genero", "");
    }
  }, [watch("titulo"), watch("autor"), livros]);

  function formatarData(dataString: string) {
    return new Date(dataString).toLocaleDateString("pt-BR");
  }

  function formatarEmprestimo(e: Emprestimo) {
    const usuario = usuarios.find((u) => u.id === e.usuarioId);
    const nome = usuario
      ? usuario.nome.split(" ").slice(0, 2).join(" ")
      : "Usuário desconhecido";

    const titulos = e.livrosIds
      .map((id) => livros.find((l) => l.id === id)?.titulo)
      .filter(Boolean)
      .join(", ");

    if (e.status === "ativo")
      return `${titulos} | Emprestado em ${formatarData(e.data)} para ${nome}`;

    return `${titulos} | Devolvido em ${formatarData(
      e.dataDevolucao || e.data
    )} por ${nome}`;
  }

  const emprestimosAtivos = emprestimos.filter((e) => e.status === "ativo");
  const emprestimosConcluidos = emprestimos.filter(
    (e) => e.status === "concluido"
  );

  async function submitUsuario(data: UsuarioForm) {
    const response = await fetch("/api/create/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      if (result.mensagem?.includes("e-mail")) {
        setError("email", {
          type: "manual",
          message: result.mensagem,
        });
      }
      return;
    }

    userReset();
    carregarDados();
  }

  async function submitLivro(data: LivroForm) {
    await fetch("/api/create/livros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        quantidade: Number(data.quantidade),
      }),
    });

    bookReset();
    carregarDados();
  }

  async function onSubmitEmprestimo(data: EmprestimoForm) {
    await fetch("/api/emprestar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuarioId: data.usuarioId,
        livrosIds: [data.livroId],
      }),
    });

    resetEmprestimo();
    carregarDados();
  }

  async function onSubmitDevolucao(data: DevolucaoForm) {
    await fetch("/api/devolver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emprestimoId: data.emprestimoId,
      }),
    });

    resetDevolucao();
    carregarDados();
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 mt-15">
      <header className="fixed top-0 w-full bg-white/70 backdrop-blur-md border-b shadow-sm px-6 h-16 flex items-center justify-between z-10">
        <Link href="/" className="text-xl font-semibold text-green-600">
          📚 Biblioteca
        </Link>
      </header>

      <main className="flex flex-col items-center gap-8 px-4 py-10">
        <h1 className="text-5xl font-semibold text-green-700 text-center">
          Sistema de Biblioteca
        </h1>

        <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-lg p-8 flex flex-col gap-5">
          <h1 className="text-2xl font-semibold text-green-700 text-left">Cadastro</h1>

          <div className="grid md:grid-cols-2 gap-8">
            <form onSubmit={userHandleSubmit(submitUsuario)} className="flex flex-col gap-3 p-5 rounded-xl">
              <h2 className="font-semibold text-green-600">Adicionar Usuário</h2>

              <div className="relative h-18">
                <label className="pl-1 text-xs text-slate-500">Nome</label>
                <input type="text" {...userRegister("nome")} className="input" />
                {usuarioErrors.nome && (
                  <span className="pl-1 text-red-700 text-[0.75rem]">
                    {usuarioErrors.nome.message}
                  </span>
                )}
              </div>

              <div className="relative h-18">
                <label className="pl-1 text-xs text-slate-500">Email</label>
                <input type="text" {...userRegister("email")} className="input" />
                {usuarioErrors.email && (
                  <span className="pl-1 text-red-700 text-[0.75rem]">
                    {usuarioErrors.email.message}
                  </span>
                )}
              </div>

              <div className="relative h-18">
                <label className="pl-1 text-xs text-slate-500">Telefone</label>
                <input type="text" {...userRegister("telefone")} className="input" />
                {usuarioErrors.telefone && (
                  <span className="pl-1 text-red-700 text-[0.75rem]">
                    {usuarioErrors.telefone.message}
                  </span>
                )}
              </div>

              <button className="btn-primary">Adicionar</button>
            </form>

            <form
              onSubmit={bookHandleSubmit(submitLivro)}
              className="flex flex-col gap-3 p-5 rounded-xl"
            >
              <h2 className="font-semibold text-green-600">Adicionar Livro</h2>

              <div className="relative h-18">
                <label className="pl-1 text-xs text-slate-500">Título</label>
                <input type="text" {...bookRegister("titulo")} className="input" />
                {livroErrors.titulo && (
                  <span className="pl-1 text-red-700 text-[0.75rem]">
                    {livroErrors.titulo.message}
                  </span>
                )}
              </div>

              <div className="relative h-18">
                <label className="pl-1 text-xs text-slate-500">Autor</label>
                <input type="text" {...bookRegister("autor")} className="input" />
                {livroErrors.autor && (
                  <span className="pl-1 text-red-700 text-[0.75rem]">
                    {livroErrors.autor.message}
                  </span>
                )}
              </div>

              <div className="relative h-18">
                <label className="pl-1 text-xs text-slate-500">Gênero</label>
                <input
                  type="text"
                  {...bookRegister("genero")}
                  className="input"
                  disabled={generoBloqueado}
                />
                {livroErrors.genero && (
                  <span className="pl-1 text-red-700 text-[0.75rem]">
                    {livroErrors.genero.message}
                  </span>
                )}
              </div>

              <div className="relative h-18">
                <label className="pl-1 text-xs text-slate-500">Quantidade</label>
                <input
                  type="text"
                  {...bookRegister("quantidade", { valueAsNumber: true })}
                  className="input"
                />
                {livroErrors.quantidade && (
                  <span className="pl-1 text-red-700 text-[0.75rem]">
                    {livroErrors.quantidade.message}
                  </span>
                )}
              </div>

              <button className="btn-primary">Adicionar</button>

              {livroDuplicado && (
                <span className="text-yellow-600 text-sm mt-2">
                  Este respectivo livro já existe na biblioteca e sua quantidade será adicionada aos que já existem!
                </span>
              )}
            </form>
          </div>
        </div>

        <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-lg p-8 flex flex-col gap-5">
          <h1 className="text-2xl font-semibold text-green-700 text-left">
            Movimentações
          </h1>

          <div className="w-full max-w-5xl bg-white rounded-2xl p-8">
            <h2 className="font-semibold text-green-600">Realizar Empréstimo</h2>

            <div className="flex flex-col gap-3 mt-4">
              <div className="relative h-18">
                <label className="text-xs pl-1 text-slate-500">Usuário</label>
                <select
                  className="input"
                  {...registerEmprestimo("usuarioId")}
                >
                  <option value="">Selecione o usuário</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {`Usuário: ` + u.nome} | {`E-mail: ` + u.email}
                    </option>
                  ))}
                </select>
                {emprestimoErrors.usuarioId && (
                  <span className="text-red-700 text-xs pl-1">
                    {emprestimoErrors.usuarioId.message}
                  </span>
                )}
              </div>
              
              <div className="relative h-18">
                <label className="text-xs pl-1 text-slate-500">Livro</label>
                <select
                  className="input"
                  {...registerEmprestimo("livroId")}
                >
                  <option value="">Selecione o livro</option>
                  {livros.map((l) => {
                    const disponiveis = l.quantidade - l.qtdEmprestados;
                    const esgotado = disponiveis <= 0;

                    return (
                      <option key={l.id} value={l.id} disabled={esgotado}>
                        {`Título: ` + l.titulo} ({disponiveis + ` disponível(s) de ` + l.quantidade}){" "}
                        {esgotado ? "- Esgotado" : ""}
                      </option>
                    );
                  })}
                </select>
                {emprestimoErrors.livroId && (
                  <span className="text-red-700 text-xs pl-1">
                    {emprestimoErrors.livroId.message}
                  </span>
                )}
              </div>

              <button
                onClick={emprestimoHandleSubmit(onSubmitEmprestimo)}
                className="btn-primary mt-2"
              >
                Emprestar
              </button>
            </div>
          </div>

          {emprestimosAtivos.length > 0 && (

            <div className="w-full max-w-5xl bg-white rounded-2xl p-8">
              <h2 className="font-semibold text-green-600">Realizar Devolução</h2>

              <div className="flex flex-col gap-3 mt-4">
                <div className="relative h-18">
                  <label className="text-xs text-slate-500 pl-1">Empréstimo</label>
                  <select
                    className="input"
                    {...registerDevolucao("emprestimoId")}
                  >
                    <option value="">Selecione</option>
                    {emprestimosAtivos.map((e) => (
                      <option key={e.id} value={e.id}>
                        {formatarEmprestimo(e)}
                      </option>
                    ))}
                  </select>

                  {devolucaoErrors.emprestimoId && (
                    <span className="text-red-700 text-xs pl-1">
                      {devolucaoErrors.emprestimoId.message}
                    </span>
                  )}
                </div>

                <button
                  onClick={devolucaoHandleSubmit(onSubmitDevolucao)}
                  className="btn-primary mt-2"
                >
                  Devolver
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-lg p-8 flex flex-col gap-5">
          <h1 className="text-2xl font-semibold text-green-700 text-left">
            Histórico
          </h1>

          {emprestimosConcluidos.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-xl p-5">
              <h2 className="font-semibold text-green-600">
                Empréstimos Concluídos
              </h2>

              <select className="input">
                {emprestimosConcluidos.map((e) => (
                  <option key={e.id}>{formatarEmprestimo(e)}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-slate-400 text-sm mt-2">
              Nenhum empréstimo realizado foi devolvido ainda!
            </p>
          )}
        </div>
      </main>

      <footer className="w-full border-t border-green-600 px-6 flex items-center justify-evenly bg-white text-sm text-center py-3 text-slate-500 shadow-sm">
        <p>© {new Date().getFullYear()} UsefulToolsPortal | Rio Pomba Valley | Todos os direitos reservados.</p>

        <div className="flex items-center gap-6">
          <span>
            Feito por <span className="text-green-500">Renan Felliphe</span>
          </span>
          <a
            href="https://instagram.com/renan_felliphe11"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-green-500 transition-colors duration-300"
          >
            Instagram
          </a>
          <a
            href="https://www.linkedin.com/in/renan-felliphe-moura-34ab1126a/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-green-500 transition-colors duration-300"
          >
            LinkedIn
          </a>
        </div>
      </footer>
    </div>
  );
}