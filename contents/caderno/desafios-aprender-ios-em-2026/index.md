---
title: "Aprender iOS com IA: a dúvida começa depois do await"
description: "A resposta chega em segundos e o código parece familiar. Eu ainda preciso saber o que ele pressupõe: quem cancela a Task se a tela sair antes da resposta?"
date: "2026-09-22"
topic: "notas"
draft: false
readingOrder: 99
tags: ["iOS", "Swift", "aprendizado", "IA", "SwiftUI", "concorrência"]
cover: "/covers/desafios-2026.png"
coverAlt: "Ícone de uma lâmpada sobre fundo vermelho, representando uma opinião sobre aprender iOS hoje."
readingMinutes: 5
---

Eu peço para a IA explicar como carregar um usuário numa tela. Ela devolve uma `Task`, um `await` e uma propriedade sendo atualizada. Leio o código e reconheço as peças. Parece que entendi.

Aí vem uma pergunta: **e se eu sair da tela antes de a resposta chegar?**

É nessa hora que aprender iOS em 2026 fica estranho para mim. A resposta chega em segundos, mas eu ainda preciso descobrir o que ela pressupõe sobre o app. Reconhecer a sintaxe dá uma confiança que nem sempre se sustenta quando eu mudo uma condição do exemplo.

Antes, eu gastava mais tempo procurando documentação, comparando artigos e quebrando código no console. Com a IA, eu chego ao exemplo muito mais rápido. O que me irrita é avançar várias respostas sem conseguir explicar por que aquele código serve para o que estou construindo.

## A dúvida começa depois do await

Esse trecho depende de um contexto que não aparece aqui: já existe um `service`, uma propriedade `user`, e o código está dentro de um método:

```swift fragment
Task {
    let user = try await service.fetchUser()
    self.user = user
}
```

O caminho de sucesso é fácil de acompanhar: buscar o usuário, receber a resposta, atualizar a propriedade. Mas esse trecho não me diz quem controla a duração do trabalho. Criar uma `Task {}` não faz com que ela seja cancelada automaticamente quando a tela sai.

Se o carregamento só interessa enquanto a tela está aberta, quem vai pedir o cancelamento? O serviço reage a esse pedido? E, se a resposta chegar mesmo assim, ela ainda deve atualizar esse estado?

Também falta saber o que acontece com o erro. Nesse trecho, não há tratamento dentro da `Task` nem alguém aguardando seu resultado. Se a busca falhar, como a tela vai ficar sabendo?

É aqui que uma explicação bem organizada pode me enganar. Eu acompanho o caminho que ela mostra, mas ainda não sei o que acontece quando o usuário faz outra coisa.

## “Estudar concorrência” é grande demais

Quando percebi que estava consumindo mais do que conseguia usar, comecei a reduzir a unidade de estudo. “Vou estudar concorrência” cabia em qualquer curso, artigo ou vídeo. Era difícil saber quando eu tinha avançado.

A pergunta sobre sair da tela é menor. Dá para montar um caso em que eu controlo quando o serviço responde: começo o carregamento, saio da tela e só então libero a resposta. Antes de executar, tento dizer se a atribuição a `user` vai acontecer e por quê.

<img src="/covers/concurency.svg" alt="Ilustração sobre concorrência em Swift, com Task, await e uma dúvida sobre user." width="480" height="253" loading="lazy">

O teste controla a ordem dos acontecimentos. Sair da tela não informa, por si só, se o trabalho foi cancelado ou se o resultado ainda pode alterar `user`.

Se eu esperava que a `Task` parasse e ela continuou, agora tenho uma dúvida concreta para investigar. Se eu pedir o cancelamento, ainda preciso conferir como o trabalho responde a isso. Em Swift, cancelar é um pedido; não interrompe automaticamente qualquer função em execução.

Não preciso transformar cada estudo num app completo. Preciso de um caso pequeno em que consiga mudar uma condição e acompanhar a consequência. Um breakpoint depois do `await` pode me ensinar mais sobre essa dúvida do que outro resumo das mesmas APIs.

Posso pedir à IA ajuda para montar o caso, achar a documentação relevante e levantar uma hipótese. Mas preciso dizer o que espero observar. Se qualquer resultado me parecer plausível, ainda falta entender alguma coisa.

## O feed não sabe o que meu código precisa

Além da resposta pronta, tem a sensação de urgência. SwiftUI, UIKit, concorrência, testes, arquitetura, IA. Tudo aparece como algo que eu já deveria saber.

<img src="/covers/duvida.svg" alt="Ilustração com os nomes SwiftUI, UIKit, IA, Arquitetura e Concorrência ao redor da pergunta “Já deveria saber?” e da palavra “Urgência!!!”, representando a pressão de estar sempre atrasado." width="480" height="320" loading="lazy">


Às vezes, “preciso estudar arquitetura” nem vem de uma dificuldade no app. Vem de olhar uma solução cheia de nomes conhecidos e achar que eu deveria entender aquilo. No meu caso, parte dessa dúvida vinha do medo de ficar para trás.

Aí eu abria mais um conteúdo. Era fácil confundir o tempo que eu passava lendo com a capacidade de tomar uma decisão sozinho depois.

O que tem me ajudado é voltar ao código que estou escrevendo. Qual decisão está me travando agora? Se a dúvida é quem deve guardar um estado, posso começar por quem lê, quem altera e por quanto tempo aquele valor precisa existir. Já tenho algo para investigar, em vez de tentar aprender uma arquitetura inteira sem saber que problema ela resolveria ali.

## O que eu quero conseguir explicar

Com `@State`, por exemplo, saber escrever o property wrapper é só o começo. Eu quero conseguir apontar qual valor muda quando toco no botão, quem é responsável por ele e qual parte da interface depende desse valor. Se eu guardar um segundo estado derivado do primeiro, quem vai manter os dois sincronizados?

Posso até precisar voltar a um fundamento, mas essas perguntas me ajudam a entender por quê.

Eu ainda uso IA e continuo gostando de receber uma resposta rápido. Só tento não encerrar o estudo na hora em que o código parece familiar.

Naquele carregamento, eu quero chegar ao ponto de olhar para a linha depois do `await` e explicar o que acontece se a tela já tiver saído — e onde esse comportamento está garantido no código.

Para conferir as regras do exemplo: [`Task` e seu tempo de vida](https://developer.apple.com/documentation/swift/task/) e [cancelamento cooperativo](<https://developer.apple.com/documentation/swift/task/cancel()>).
