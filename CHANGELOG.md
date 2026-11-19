# Changelog

## 2026-11-19

### PT
- **Correção: a regra da bomba não estava a funcionar.** O script da tomada envia o traço ao segundo como texto (`"58,135,13,..."`) e não como lista, por isso `bomba` dava sempre `sem_dados`. Agora o texto é convertido em números.
- **Cafés curtos com a máquina quente passam a contar.** A regra "menos de `cafe_limite_aquecimento_s` (15 s) a trabalhar = ligar a máquina" descartava cafés de 14 s tirados com a máquina já quente. Nova classificação:
  - máquina fria e `bomba == 'nao'` → `aquecimento`;
  - máquina fria, sem traço (`sem_dados`) e menos de 15 s → `aquecimento` (regra antiga, só como recurso);
  - máquina quente e (`pmax` < 1000 W ou menos de 5 s acima de 600 W) → `aquecimento`;
  - o resto é classificado como até aqui (cappuccino, lungo, café).

### EN
- **Fix: the pump rule was not working.** The plug script sends the per-second trace as text (`"58,135,13,..."`), not as a list, so `bomba` was always `sem_dados`. The text is now converted to numbers.
- **Short coffees on a warm machine now count.** The "less than `cafe_limite_aquecimento_s` (15 s) of work = switching the machine on" rule dropped 14 s coffees made on an already warm machine. New classification:
  - cold machine and `bomba == 'nao'` → `aquecimento`;
  - cold machine, no trace (`sem_dados`) and under 15 s → `aquecimento` (old rule, fallback only);
  - warm machine and (`pmax` < 1000 W or under 5 s above 600 W) → `aquecimento`;
  - everything else is classified as before (cappuccino, lungo, coffee).

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
