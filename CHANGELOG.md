# Changelog

## 2026-11-21

### PT
- **Cafés com a máquina fria contados como aquecimento.** A regra da bomba (potência >= 40 W acima do patamar inicial durante >= 3 s) falhava por uma amostra em cafés reais (2 em vez de 3 s), e dois cafés do dia foram ignorados. A máquina fria passa a contar também quando o traço tem **duas fases de aquecimento** (>= 3 s acima de 1000 W, separadas por uma descida) ou **>= 3 s entre 350 e 1000 W** depois do aquecimento (bomba). O aquecimento ao ligar continua a ser ignorado: é uma só fase plana, sem bomba.
- Testado com os 38 blocos registados desde 17-11-2026: todos os aquecimentos continuam a ser aquecimento e só mudam os dois cafés que tinham sido perdidos.

### EN
- **Coffees on a cold machine counted as warm-up.** The pump rule (power >= 40 W above the initial level for >= 3 s) missed real coffees by one sample (2 s instead of 3), and two coffees in a day were dropped. A cold machine now also counts a drink when the trace has **two heating phases** (>= 3 s above 1000 W, separated by a dip) or **>= 3 s between 350 and 1000 W** after heating (pump). The power-on warm-up is still ignored: it is a single flat phase with no pump.
- Tested against the 38 blocks recorded since 2026-11-17: every warm-up is still a warm-up and only the two missed coffees change.

## 2026-11-19

### PT
- **Correção: a regra da bomba não estava a funcionar.** O script da tomada envia o traço ao segundo como texto (`"58,135,13,..."`) e não como lista, por isso `bomba` dava sempre `sem_dados`. Agora o texto é convertido em números.
- **Cafés curtos com a máquina quente passam a contar.** A regra "menos de `cafe_limite_aquecimento_s` (15 s) a trabalhar = ligar a máquina" descartava cafés de 14 s tirados com a máquina já quente. Nova classificação:
  - máquina fria e `bomba == 'nao'` → `aquecimento`;
  - máquina fria, sem traço (`sem_dados`) e menos de 15 s → `aquecimento` (regra antiga, só como recurso);
  - máquina quente e (`pmax` < 1000 W ou menos de 5 s acima de 600 W) → `aquecimento`;
  - o resto é classificado como até aqui (cappuccino, lungo, café).
- **Lungo vs café pela fase intermédia, não pela duração.** Nova variável `meio`: segundos entre 350 e 1000 W durante a extração (do primeiro pico até 3+ s abaixo de 350 W). Lungo se `meio` ≥ 5; a regra antiga (duração ≥ `cafe_limite_lungo_total_s`, 70 s) só se usa sem traço. Uma reposição de temperatura logo a seguir a um café esticou o bloco para 107 s e ele foi contado como lungo. O evento `cafe_m_bloco` passa a levar `meio`.

### EN
- **Fix: the pump rule was not working.** The plug script sends the per-second trace as text (`"58,135,13,..."`), not as a list, so `bomba` was always `sem_dados`. The text is now converted to numbers.
- **Short coffees on a warm machine now count.** The "less than `cafe_limite_aquecimento_s` (15 s) of work = switching the machine on" rule dropped 14 s coffees made on an already warm machine. New classification:
  - cold machine and `bomba == 'nao'` → `aquecimento`;
  - cold machine, no trace (`sem_dados`) and under 15 s → `aquecimento` (old rule, fallback only);
  - warm machine and (`pmax` < 1000 W or under 5 s above 600 W) → `aquecimento`;
  - everything else is classified as before (cappuccino, lungo, coffee).
- **Lungo vs coffee by the mid-power phase, not by duration.** New variable `meio`: seconds between 350 and 1000 W during the extraction (from the first peak until 3+ s below 350 W). Lungo when `meio` ≥ 5; the old rule (duration ≥ `cafe_limite_lungo_total_s`, 70 s) is only used without a trace. A temperature top-up right after a coffee stretched the block to 107 s and it was counted as a lungo. The `cafe_m_bloco` event now carries `meio`.

## 2026-11-18

### PT
- **Arranque a frio já não conta como café.** Quando a máquina esteve parada pelo menos `cafe_arranque_min` minutos (30 por omissão), o bloco só conta como bebida se se vir a bomba a trabalhar: a potência sobe pelo menos 40 W acima do patamar inicial durante 3 s ou mais. Se o patamar ficar plano ou a descer, é só aquecimento e é ignorado.
  - Novas variáveis em `cafe_registar_bebida`: `frio` e `bomba` (`sim`, `nao` ou `sem_dados` quando o script não envia o traço).
  - Novo ramo na classificação: `frio and bomba == 'nao'` → `aquecimento` (não conta).
- O evento `cafe_m_bloco` passa a levar `bomba`, e o sensor das últimas extrações (`cafe_shelly_m.yaml`) guarda-o como `b`, para conferir a decisão.

### EN
- **A cold start no longer counts as a coffee.** If the machine has been idle for at least `cafe_arranque_min` minutes (30 by default), a block only counts as a drink when the pump is seen working: power rises at least 40 W above the initial plateau for 3 s or more. A flat or falling plateau is heating only and is ignored.
  - New variables in `cafe_registar_bebida`: `frio` (cold) and `bomba` (pump: `sim`, `nao`, or `sem_dados` when the script sends no trace).
  - New classification branch: `frio and bomba == 'nao'` → `aquecimento` (not counted).
- The `cafe_m_bloco` event now carries `bomba`, and the last-extractions sensor (`cafe_shelly_m.yaml`) stores it as `b` for checking.
