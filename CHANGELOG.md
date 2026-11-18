# Changelog

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
