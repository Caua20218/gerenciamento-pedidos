const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORTA = 3000;

app.use(cors());
app.use(express.json());

const arquivoPedidos = path.join(__dirname, "pedidos.json");

let pedidos = [];

function carregarPedidos() {
  try {
    if (fs.existsSync(arquivoPedidos)) {
      const dados = fs.readFileSync(arquivoPedidos, "utf8");
      pedidos = JSON.parse(dados);

      if (!Array.isArray(pedidos)) {
        pedidos = [];
      }
    } else {
      salvarPedidos();
    }
  } catch (erro) {
    console.error("Erro ao carregar pedidos:", erro.message);
    process.exit(1);
  }
}

function salvarPedidos() {
  fs.writeFileSync(
    arquivoPedidos,
    JSON.stringify(pedidos, null, 2),
    "utf8"
  );
}

carregarPedidos();

app.get("/", (req, res) => {
  res.json({
    mensagem: "API do Gerenciador de Pedidos funcionando!"
  });
});

app.get("/pedidos", (req, res) => {
  res.json(pedidos);
});

app.post("/pedidos", (req, res) => {
  const { cliente, tipo, valor, prioridade } = req.body;

  if (
    typeof cliente !== "string" ||
    !cliente.trim() ||
    typeof tipo !== "string" ||
    !tipo.trim() ||
    !Number.isFinite(Number(valor)) ||
    Number(valor) <= 0 ||
    !["Baixa", "Média", "Alta"].includes(prioridade)
  ) {
    return res.status(400).json({
      erro: "Confira os dados do pedido."
    });
  }

  const novoPedido = {
    id: Date.now().toString(),
    cliente: cliente.trim(),
    tipo: tipo.trim(),
    valor: Number(valor),
    prioridade,
    status: "Pendente"
  };

  pedidos.push(novoPedido);

  try {
    salvarPedidos();
    res.status(201).json(novoPedido);
  } catch (erro) {
    pedidos.pop();
    res.status(500).json({
      erro: "Não foi possível salvar o pedido."
    });
  }
});

app.get("/pedidos/:id", (req, res) => {
  const pedido = pedidos.find(
    (item) => String(item.id) === String(req.params.id)
  );

  if (!pedido) {
    return res.status(404).json({
      erro: "Pedido não encontrado."
    });
  }

  res.json(pedido);
});

app.patch("/pedidos/:id/status", (req, res) => {
  const { status } = req.body;
  const statusValidos = [
    "Pendente",
    "Em andamento",
    "Concluído",
    "Cancelado"
  ];

  if (!statusValidos.includes(status)) {
    return res.status(400).json({
      erro: "Status inválido."
    });
  }

  const pedido = pedidos.find(
    (item) => String(item.id) === String(req.params.id)
  );

  if (!pedido) {
    return res.status(404).json({
      erro: "Pedido não encontrado."
    });
  }

  const statusAnterior = pedido.status;
  pedido.status = status;

  try {
    salvarPedidos();
    res.json(pedido);
  } catch (erro) {
    pedido.status = statusAnterior;
    res.status(500).json({
      erro: "Não foi possível salvar o novo status."
    });
  }
});

app.delete("/pedidos/:id", (req, res) => {
  const indice = pedidos.findIndex(
    (item) => String(item.id) === String(req.params.id)
  );

  if (indice === -1) {
    return res.status(404).json({
      erro: "Pedido não encontrado."
    });
  }

  const [pedidoRemovido] = pedidos.splice(indice, 1);

  try {
    salvarPedidos();
    res.json({
      mensagem: "Pedido excluído com sucesso."
    });
  } catch (erro) {
    pedidos.splice(indice, 0, pedidoRemovido);
    res.status(500).json({
      erro: "Não foi possível excluir o pedido."
    });
  }
});

app.listen(PORTA, () => {
  console.log(`API funcionando em http://localhost:${PORTA}`);
});