# Contador de cafés com Shelly Plug M Gen3 — Guia de instalação

Nov 18, 2026 · @Milton

Este guia leva-te da tomada ainda na caixa até ao separador Café a contar bebidas, em cerca de 30 minutos. Os ficheiros estão no repositório [miltonleopoldo/shelly-coffee-counter](https://github.com/miltonleopoldo/shelly-coffee-counter).

## O que vais precisar

| Item | Para quê | Notas |
| --- | --- | --- |
| Shelly Plug M Gen3 | Mede a potência a cada segundo e corre o script | Testado com o firmware 2.2.0 |
| Máquina de café ligada à tomada | A fonte das leituras | Testado numa Lattissima One Evo (EN510.B) |
| Home Assistant 2026.11 ou mais recente | Recebe e conta as bebidas | Precisa de acesso aos ficheiros (File editor, Samba ou VS Code) |
| App do HA no telemóvel | Avisos de stock, depósitos e extrações perdidas | Opcional |
| HACS com button-card e apexcharts-card | Só para o dashboard | Opcional |
| `packages/cafe.yaml` e `packages/cafe_shelly_m.yaml` | A lógica no HA | Do repositório |
| `shelly/contador_cafe.js` | O script da tomada | Do repositório |
| `dashboard/vista-cafe.yaml` | O separador Café | Do repositório, opcional (versão em inglês: coffee-view.yaml) |

## Passo 1: configurar a Shelly Plug M Gen3

No fim deste passo a tomada está na tua rede com IP fixo e o HA já mostra a entidade `sensor.coffee_machine_power`.

1. Liga a tomada à parede e a máquina de café à tomada. Na primeira vez a Shelly cria uma rede Wi-Fi própria com um nome começado por `ShellyPlugMG3-`.
2. Liga o telemóvel ou o PC a essa rede e abre `http://192.168.33.1`. Este é o endereço de fábrica das Shelly e só funciona nesta fase, enquanto estiveres ligado à rede Wi-Fi da própria tomada. Também podes fazer isto pela app Shelly Smart Control, se preferires.
3. Em *Settings → Wi-Fi*, liga a tomada à tua rede de casa. Desliga o ponto de acesso da Shelly depois de confirmares que entrou na rede.
4. No router, reserva um IP fixo para a tomada (reserva DHCP pelo endereço MAC, que aparece no fundo da página da Shelly). O script e o teste usam este IP.
5. Volta a ligar o telemóvel ou o PC à rede de casa e abre a página da tomada no IP que o router lhe atribuiu, `http://<IP_DA_TOMADA>` (substitui `<IP_DA_TOMADA>` pelo IP real da tua Shelly; é este o endereço usado no resto do guia). Atualiza o firmware em *Settings → Firmware*. O guia foi testado com a versão 2.2.0.
6. Em *Settings → Device name* põe o nome **Coffee Machine**. Com este nome o HA costuma criar `sensor.coffee_machine_power`, a entidade que o pacote usa, mas o ID pode ficar diferente. Confirma o ID real no ponto 9 e, se não for este, segue a indicação no fim deste passo.
7. Em *Output → Power on default* escolhe **On** ou **Restore last**, para a máquina não ficar sem corrente depois de uma falha de luz.
8. No HA, vai a *Definições → Dispositivos e serviços*. A integração Shelly costuma aparecer como descoberta; carrega em *Configurar*. Se não aparecer, adiciona-a à mão com o IP da tomada.
9. Confirma em *Ferramentas de programador → Estados* que existe `sensor.coffee_machine_power` e que mostra potência quando tiras um café.

Se a tua entidade ficou com outro nome, muda-lhe o ID para `sensor.coffee_machine_power` nas definições da entidade, ou troca esse nome no `cafe.yaml`.

## Passo 2: preparar o Home Assistant

O HA tem de aceitar packages e ter os dois ficheiros de registo CSV que a lógica usa.

1. Abre o `configuration.yaml` e acrescenta, se ainda não existir:

```yaml
homeassistant:
  packages: !include_dir_named packages
  allowlist_external_dirs:
    - /config
```

As linhas `packages` e `allowlist_external_dirs` ficam indentadas dois espaços dentro de `homeassistant:`, e o `- /config` mais dois; sem essa indentação o HA não aceita a configuração. Se o teu `configuration.yaml` já tiver uma secção `homeassistant:`, não cries outra: acrescenta só estas linhas dentro da que já existe.

2. Cria a pasta `/config/packages/` se não existir.
3. Em *Definições → Dispositivos e serviços → Adicionar integração*, adiciona a integração **File** duas vezes, do tipo *Notification*:
   - ficheiro `/config/registo_cafes.csv`, nome **Registo cafes** (cria `notify.registo_cafes`);
   - ficheiro `/config/registo_capsulas.csv`, nome **Registo capsulas** (cria `notify.registo_capsulas`).
4. Confirma que a app do HA está instalada no telemóvel e anota o nome do serviço de notificação: em *Ferramentas de programador → Ações*, procura `notify.mobile_app_`. Vais precisar dele no passo seguinte.

Se preferires não ter os registos em CSV, salta o ponto 3 e apaga no `cafe.yaml` as duas ações `notify.send_message` que escrevem nesses ficheiros.

## Passo 3: instalar os pacotes no HA

Depois deste passo existem no HA todos os contadores, helpers, sensores e automações do café, à espera das bebidas.

1. Copia `packages/cafe.yaml` e `packages/cafe_shelly_m.yaml` do repositório para `/config/packages/`.
2. Inventa um ID para o webhook, aleatório e difícil de adivinhar, por exemplo `cafe_m_` seguido de 20 letras e números. Funciona como uma senha.
3. No `cafe.yaml`, procura e substitui:

| Procurar | Trocar por | Onde aparece |
| --- | --- | --- |
| `<O_TEU_WEBHOOK_ID>` | o ID do ponto 2 | automação `cafe_registar_bebida` |
| `notify.mobile_app_o_teu_telemovel` | o serviço do teu telemóvel | 3 avisos: stock, depósitos, extração perdida |
| `sensor.coffee_machine_power` | só se a tua entidade tiver outro nome | sensores de energia e potência |

4. Em *Ferramentas de programador → YAML*, carrega em **Verificar configuração**. Corrige o que aparecer antes de continuar.
5. **Reinicia o Home Assistant.** Um reload não chega, porque os `counter` novos só aparecem depois de reiniciar.
6. Confirma em *Estados* que existem, entre outros, `counter.cafe_bebidas`, `input_number.cafe_stock_capsulas`, `sensor.cafes_hoje` e `automation.cafe_registar_bebida`.

## Passo 4: instalar o script na tomada

O script `contador_cafe` passa a correr dentro da Shelly e envia cada bebida para o webhook do passo 3.

1. Abre a página da tomada (`http://<IP_DA_TOMADA>`) e vai a **Scripts** (o ícone `<>` na barra lateral).
2. Carrega em **Create script** e dá-lhe o nome `contador_cafe`.
3. Cola o conteúdo de `shelly/contador_cafe.js` no editor.
4. Na linha `let URL = ...` põe o IP do teu HA e o webhook ID do passo 3:

```js
let URL = 'http://192.168.1.50:8123/api/webhook/cafe_m_xxxxxxxxxxxxxxxxxxxx';
```

5. Carrega em **Save** e depois em **Start**. O botão passa a mostrar *Stop*, sinal de que o script está a correr.
6. Na lista de scripts, ativa **Run on startup** (o interruptor ao lado do nome), para o script voltar a arrancar sozinho depois de uma falha de luz.

O script deve ser o primeiro da tomada, com o id 1. Se já tinhas outros scripts, o endereço de teste do passo seguinte muda: `script/<id>/teste`.

## Passo 5: testar

Se os dois testes passarem, a instalação está feita.

**Teste da ligação.** Abre no browser `http://<IP_DA_TOMADA>/script/1/teste`. A página responde *teste enviado* e, segundos depois, aparece no HA uma notificação persistente “Teste recebido da tomada da máquina às …”. O teste não conta como bebida nem mexe no stock.

**Teste com uma bebida.** Tira um café. A tomada só envia a bebida depois de a máquina ficar 10 s em repouso, por isso espera uns 30 s depois de acabar. Depois confirma:

- `input_text.cafe_ultima` mostra o tipo, a hora, os segundos e os Wh da bebida;
- `counter.cafe_bebidas` subiu 1 e `input_number.cafe_stock_capsulas` desceu 1;
- `sensor.cafe_m_ultimos_blocos` tem a bebida no atributo `lista`, com o registo segundo a segundo em `tr`.

Se ligaste a máquina mesmo antes do café, o aquecimento aparece em `sensor.cafe_m_ultimos_blocos` como *aquecimento* e não conta. É o comportamento esperado.

**Como se separa o aquecimento de uma bebida.** Com a máquina parada há pelo menos `cafe_arranque_min` minutos (máquina fria), o bloco só conta como bebida se o registo segundo a segundo (`tr`) mostrar uma destas três coisas: a potência sobe ≥ 40 W acima do patamar inicial durante ≥ 3 s; há duas fases de aquecimento (≥ 3 s acima de 1000 W) separadas por uma descida; ou há ≥ 3 s entre 350 e 1000 W depois do aquecimento (bomba). O aquecimento ao ligar é uma só fase plana, sem nada disto. Com a máquina quente, conta tudo o que passar de 1000 W durante ≥ 5 s.

## Passo 6: instalar o dashboard

Este passo é opcional: a contagem já funciona sem ele. Acrescenta o separador Café com a máquina, os totais, as últimas bebidas, o stock, os gráficos e os depósitos.

1. Instala pelo HACS (no HA 2026.11 está em *Definições → Marketplace*) os cartões **button-card** e **apexcharts-card**. Recarrega o browser depois de instalares.
2. Abre o dashboard onde queres o separador, carrega nos três pontos e escolhe **Editar dashboard → Editor de configuração em texto**.
3. Dentro de `views:`, cola o conteúdo de `dashboard/vista-cafe.yaml` como mais um item da lista, com a mesma indentação das outras vistas. Guarda. Se quiseres o separador em inglês, cola antes o dashboard/coffee-view.yaml.
4. O ficheiro tem três cartões `custom:jarvis-popup-card`, que são um cartão pessoal não publicado e não existem noutras instalações. Antes de usares o dashboard, apaga estes três cartões do YAML ou troca-os por cartões que tenhas instalados. Se os deixares, aparecem como cartões com erro.
5. O cartão da máquina mostra modelo, número de série e data de compra. Troca esses textos pelos da tua máquina, e a foto se for outra.

Os gráficos só ficam interessantes ao fim de uns dias de bebidas registadas.

## Passo 7: acertar os limites, o stock e os depósitos

Faz este passo logo a seguir ao reinício. Vários helpers do pacote não têm valor inicial e arrancam no mínimo. Por exemplo, o limite do cappuccino fica em 20 s e 1 Wh, e assim quase todos os cafés longos contavam como cappuccino.

Acerta os valores em *Definições → Dispositivos e serviços → Ajudantes*, ou pelo formulário no separador Café:

| Helper | Valor de partida | O que faz |
| --- | --- | --- |
| `input_number.cafe_arranque_min` | 30 min | Máquina parada há pelo menos isto = máquina fria (ver acima como se separa o aquecimento) |
| `input_number.cafe_limite_aquecimento_s` | 15 s (já vem assim) | Só se usa com a máquina fria e sem registo segundo a segundo: menos segundos do que isto é só ligar a máquina |
| `input_number.cafe_limite_cappuccino_s` | 35 s | Duração mínima de um cappuccino |
| `input_number.cafe_limite_cappuccino_wh` | 13 Wh | Energia mínima de um cappuccino |
| `input_number.cafe_limite_lungo_total_s` | 70 s (já vem assim) | Só sem registo segundo a segundo: a partir desta duração, sem energia de cappuccino, é lungo. Com registo, é lungo com ≥ 5 s entre 350 e 1000 W na extração |
| `input_number.cafe_stock_capsulas` | as cápsulas que tens | Stock atual; cada bebida desconta 1 |
| `input_number.cafe_stock_minimo` | 20 | Abaixo disto recebes aviso no telemóvel, no máximo 1 vez por dia |
| `input_number.cafe_limite_deposito_capsulas` | quantas cápsulas cabem no teu depósito | Aviso para esvaziar |
| `input_number.cafe_limite_agua` | quantas bebidas dá um depósito de água cheio | Aviso para encher |

Os valores do café, lungo e cappuccino servem para a Lattissima One Evo. Noutra máquina, tira de cada tipo de bebida, vê a duração e os Wh de cada uma em `sensor.cafe_m_ultimos_blocos` e ajusta os limites entre os valores que vires.

O helper `cafe_limite_lungo_s` é da versão antiga, com a Plug S, e já não é usado. Podes ignorá-lo.

## Problemas comuns

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| O teste não faz aparecer notificação no HA | `URL` errado no script, ou o script está parado | Confirma IP, porta e webhook ID; em *Scripts* o botão deve mostrar *Stop* |
| O teste funciona por IP mas não por nome | O webhook tem `local_only: true` | Usa o IP local do HA no `URL`, nunca o endereço externo |
| Não aparecem os `counter.cafe_*` | O HA só recarregou, não reiniciou | Reinicia o Home Assistant |
| Quase tudo conta como cappuccino | Limites do cappuccino ainda no mínimo | Acerta-os como no passo 7 |
| Recebo “extração perdida” no telemóvel | O HA esteve em baixo e falhou uma bebida | Espera 5 min: a tomada reenvia sozinha; se o aviso se mantiver, corrige a contagem à mão |
| Depois de uma falha de luz deixa de contar | O script não arranca sozinho | Ativa *Run on startup* no script |
| Nada conta | O modo manutenção está ligado | Desliga `input_boolean.cafe_manutencao`; desliga-se sozinho ao fim de 2 h |
| Erro sobre `notify.registo_cafes` nos registos | Falta a integração File | Faz o ponto 3 do passo 2, ou apaga essas ações |
| Cartões com erro no separador Café | Falta button-card, apexcharts-card ou o jarvis-popup-card | Instala os dois primeiros e apaga os `custom:jarvis-popup-card` |

Se a contagem falhar de outra maneira, abre o *Rastreio* da automação `cafe_registar_bebida` e o atributo `lista` de `sensor.cafe_m_ultimos_blocos`: mostram exatamente o que a tomada enviou e como foi classificado.
