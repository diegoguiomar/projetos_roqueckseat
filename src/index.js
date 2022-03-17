const express = require("express") // Usar o framework express
const { v4: uuidv4 } = require ("uuid") // Usar a biblioteca uuid

const app = express();

app.use(express.json())

//app.use(verifyIfExistisAccount)

const customers = []

//Middleware
function verifyIfExistsAccountCPF(request, response, next) {
    const { cpf } = request.headers

    // Identificando o cpf informado
    const customer = customers.find((customer) => customer.cpf === cpf)
    
    // Validando se o cadastro existe
    if(!customer) {
        return response.status(400).json({ error: "Customer not found!"})
    }

    //Utilizado para repassar o customer para as demais rotas que utilizarem o middleware
    //Repassar informações através do request
    request.customer = customer

    //Caso haja o cpf, a função deverá seguir com o fluxo
    return next()
}

function getBalance(statement) {
    const balance = statement.reduce((acc, operation) => {
        if(operation.type === 'credit') {
            return acc + operation.amount
        } else {
            return acc - operation.amount
        }
    }, 0)

    return balance
}

// Cadastro de uma conta
app.post("/account", (request, response) => {
    const { cpf, name } = request.body

// Verificação se já existe o cpf cadastrado
    const customerAlreadyExists = customers.some(
        (customer) => customer.cpf === cpf
    )

// Retornar uma mensagem de erro caso já exista o cpf na base   
    if(customerAlreadyExists) {
        return response.status(400).json({ error: "Customer already exists!" })
    }

// Inserindo os dados cadastrados no array customers
    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    })

// Retorno de mensagem de dados cadastrados com sucesso
    return response.status(201).send()
})

// Listando um extrato
app.get("/statement", verifyIfExistsAccountCPF, (request, response) => {
    //Desestruturação do costumer
    const { customer } = request

// Retornando o extrato financeiro
    return response.json(customer.statement)
})

//Criando depósito em conta
app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request
    
    const { description, amount } = request.body

    const statementOperation = {
        description,
        amount,
        createdAt: new Date(),
        type: "credit"
    }

    customer.statement.push(statementOperation)

    return response.status(201).send()

})

//Solicitando um saque
app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request
    const { amount } = request.body

    const balance = getBalance(customer.statement)

    if(balance < amount) {
        return response.status(400).json({error: "Saldo insuficiente!"})
    }

    const statementOperation = {
        amount,
        createdAt: new Date(),
        type: "debit"
    }

    customer.statement.push(statementOperation)

    return response.status(201).send()
})

//Buscando um extrato por data
app.get("/statement/date", verifyIfExistsAccountCPF, (request, response) => {
    //Desestruturação do costumer
    const { customer } = request
    const { date } = request.query

    const dateFormat = new Date(date + " 00:00")

    const statement = customer.statement.filter((statement) => 
        statement.createdAt.toDateString() === new Date(dateFormat).toDateString()
    )

    return response.json(statement)
})

app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { name } = request.body
    const { customer } = request

    customer.name = name

    return response.status(201).send()
})

app.get("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request
    
    return response.json(customer)
})

app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request
    
    customers.splice(customers, 1)

    return response.status(200).json(customers)
})

app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request

    const balance = getBalance(customer.statement)

    return response.json(balance)
})

app.listen(3333)