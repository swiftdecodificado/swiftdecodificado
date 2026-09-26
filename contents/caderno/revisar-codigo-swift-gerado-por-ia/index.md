---
title: "Revisar código Swift gerado por IA: o que o build verde não diz"
description: "Código gerado costuma compilar e parecer razoável. Quatro perguntas de revisão que a compilação não responde: quem cancela, quem retém, em que modo compila e o que acontece com a entrada errada."
date: "2026-09-25"
topic: "notas"
draft: false
readingOrder: 98
tags: ["IA", "code review", "Task", "closures", "concorrência", "Swift 6"]
cover: "/covers/revisao-ia.png"
coverAlt: "Ícone de uma lupa sobre colchetes angulares em fundo vermelho, representando a revisão de código."
readingMinutes: 6
---

Código gerado por IA costuma compilar e parecer razoável. Isso responde se ele é Swift válido; não responde o que ele pressupõe sobre o app. É a dúvida da nota sobre [aprender iOS com IA](/artigos/desafios-aprender-ios-em-2026/), agora do lado de quem revisa o diff.

Abaixo estão quatro perguntas que eu faria antes de aprovar. Cada uma tem um exemplo construído para mostrar como a resposta aparece, e o que a revisão olha para encontrá-la.

> **Para executar**
>
> Cada bloco é independente: salve em `Arquivo.swift` e rode `swift Arquivo.swift` (Swift 6.4, com o modo de linguagem padrão do compilador). Os exemplos usam só a biblioteca padrão e Foundation.

## 1. Quem cancela essa `Task`?

Um carregador começa o trabalho e a tela sai antes da resposta:

```swift
final class Carregador {
    let nome: String
    init(nome: String) { self.nome = nome }
    deinit { print("Carregador liberado") }

    func carregar() {
        Task {
            try await Task.sleep(for: .milliseconds(200))
            print("Depois do await: \(nome)")
        }
    }
}

var carregador: Carregador? = Carregador(nome: "extrato")
carregador?.carregar()
carregador = nil
print("A tela saiu")
try await Task.sleep(for: .milliseconds(500))
print("Fim")
// A tela saiu
// Depois do await: extrato
// Carregador liberado
// Fim
```

Soltar a referência não cancelou nada. O trabalho terminou depois de a tela sair e, enquanto rodava, manteve o objeto vivo: o `deinit` só executa no fim. O compilador também avisa que a `Task` lança e ninguém observa o resultado (`unstructured throwing task … is not used, which may accidentally ignore errors thrown inside the task`).

Na revisão, procuro o dono do trabalho: quem guarda a `Task`, quem chama `cancel()` e se o código de dentro responde a esse pedido. `Task.sleep` lança quando cancelada; um laço sem `try Task.checkCancellation()` continua até o fim.

```swift
final class Carregador {
    let nome: String
    private var tarefa: Task<Void, Never>?
    init(nome: String) { self.nome = nome }
    deinit { print("Carregador liberado") }

    func carregar() {
        tarefa = Task {
            do {
                try await Task.sleep(for: .milliseconds(200))
                print("Depois do await: \(nome)")
            } catch {
                print("Cancelado antes do resultado")
            }
        }
    }

    func parar() async {
        tarefa?.cancel()
        await tarefa?.value
    }
}

var carregador: Carregador? = Carregador(nome: "extrato")
carregador?.carregar()
await carregador?.parar()
print("A tela saiu")
carregador = nil
print("Fim")
// Cancelado antes do resultado
// A tela saiu
// Carregador liberado
// Fim
```

Em SwiftUI, o modificador [`.task`](https://developer.apple.com/documentation/swiftui/view/task(name:priority:file:line:_:)) tem esse dono: segundo a documentação, SwiftUI cancela a tarefa em algum momento depois que a view some, se ela ainda não terminou. Uma `Task {}` criada à mão dentro da view não tem esse dono.

## 2. Quem retém essa closure?

Uma tela que guarda um callback em propriedade e o usa depois:

```swift
final class TelaComCiclo {
    var aoConcluir: (() -> Void)?
    let titulo = "Extrato"
    deinit { print("TelaComCiclo liberada") }
    func configurar() { aoConcluir = { print("Concluiu \(self.titulo)") } }
}

final class TelaSegura {
    var aoConcluir: (() -> Void)?
    let titulo = "Extrato"
    deinit { print("TelaSegura liberada") }
    func configurar() { aoConcluir = { [weak self] in print("Concluiu \(self?.titulo ?? "-")") } }
}

var ciclo: TelaComCiclo? = TelaComCiclo()
ciclo?.configurar()
ciclo = nil

var segura: TelaSegura? = TelaSegura()
segura?.configurar()
segura = nil
print("Fim")
// TelaSegura liberada
// Fim
```

A tela com ciclo nunca imprime a liberação: a propriedade guarda a closure, e a closure guarda a tela. Compila, roda e não falha; o custo é memória que não volta. Na revisão, olho toda closure guardada (propriedade, `Timer`, observador, `sink`) e pergunto se a lista de captura combina com a vida do objeto.

Nem toda captura forte forma um ciclo: uma closure que ninguém guarda só retém `self` enquanto existir. E quando há closures aninhadas, o `[weak self]` precisa estar na closure certa, como mostra o texto sobre [o `weak self` na closure errada](/artigos/weak-self-na-closure-errada/).

## 3. Compila em qual modo de linguagem?

O exemplo 1 compila e roda no modo padrão. Rode o mesmo arquivo no modo Swift 6:

```text
$ swift -swift-version 6 Arquivo.swift
error: passing closure as a 'sending' parameter risks causing data races between
code in the current isolation context and concurrent execution of the closure
note: closure captures 'self' which is accessible to code in the current isolation context
```

A mensagem vem do Swift 6.4. No modo Swift 5 a mesma linha compila sem aviso de dados compartilhados; com a checagem de concorrência completa ligada, vira aviso ("this is an error in the Swift 6 language mode"). "Compilou" depende do modo de linguagem e do nível de checagem do projeto, e o código gerado tende a ter sido escrito para o mais permissivo.

Antes de aceitar um diff, confiro esses dois ajustes do target (Xcode: modo de linguagem Swift e verificação estrita de concorrência) e leio os avisos que aparecem com a checagem completa. Não existe uma correção única: a decisão é quem é dono do valor (um `actor`, uma cópia, um tipo `Sendable`).

## 4. O que acontece com a entrada errada?

Dado externo raramente chega no formato que o exemplo assume:

```swift
import Foundation

struct Transacao: Decodable { let id: Int }

let entrada = #"{"id": "quarenta e dois"}"#
let dados = Data(entrada.utf8)

// let transacao = try! JSONDecoder().decode(Transacao.self, from: dados) // Encerra a execução: a entrada não é um Int. [diagnostic: 'try!' expression unexpectedly raised an error]

do {
    _ = try JSONDecoder().decode(Transacao.self, from: dados)
} catch {
    print("Entrada recusada")
}
// Entrada recusada
```

Com `try!`, `!` ou `as!`, o app encerra na primeira entrada fora do esperado; nos testes com dados bons, isso nunca aparece. Na revisão, procuro esses três sinais e os índices fixos (`itens[0]`), e pergunto de onde vem o dado. Se vem de fora do app, quero ver o caminho de falha, com um teste que passa uma entrada inválida.

## A lista que eu levaria para o PR

1. Toda `Task` tem dono, cancelamento e alguém que observa o erro?
2. Toda closure guardada combina sua captura com a vida do objeto?
3. Compila no modo de linguagem e na checagem de concorrência do projeto, com os avisos lidos?
4. Toda entrada externa tem caminho de falha, sem `!` nem `try!` no meio?

O build verde é o começo da revisão, não o fim.

Referências: [`Task`](https://developer.apple.com/documentation/swift/task/), [cancelamento](https://developer.apple.com/documentation/swift/task/cancel()), [`SendingClosureRisksDataRace`](https://docs.swift.org/compiler/documentation/diagnostics/sending-closure-risks-data-race/) e [`NoUseUnstructuredThrowingTask`](https://docs.swift.org/compiler/documentation/diagnostics/no-use-throwing-unstructured-task/), os diagnósticos citados.
