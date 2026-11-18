# Shelly Plug M Gen3 coffee counter — Installation guide

Nov 18, 2026 · @Milton

This guide takes you from a plug still in its box to a Coffee dashboard counting drinks, in about 30 minutes. All files are in the [miltonleopoldo/shelly-coffee-counter](https://github.com/miltonleopoldo/shelly-coffee-counter) repository. Entity names are in Portuguese; the logic does not depend on them. The dashboard comes in English and in Portuguese.

## What you need

| Item | What for | Notes |
| --- | --- | --- |
| Shelly Plug M Gen3 | Measures power every second and runs the script | Tested with firmware 2.2.0 |
| Coffee machine plugged into it | The source of the readings | Tested on a Lattissima One Evo (EN510.B) |
| Home Assistant 2026.11 or newer | Receives and counts the drinks | You need file access (File editor, Samba or VS Code) |
| HA companion app on your phone | Stock, tank and missed-drink alerts | Optional |
| HACS with button-card and apexcharts-card | Dashboard only | Optional |
| `packages/cafe.yaml` and `packages/cafe_shelly_m.yaml` | The logic in HA | From the repository |
| `shelly/contador_cafe.js` | The plug script | From the repository |
| `dashboard/coffee-view.yaml` | The Coffee dashboard view | From the repository, optional (Portuguese version: vista-cafe.yaml) |

## Step 1: set up the Shelly Plug M Gen3

At the end of this step the plug is on your network with a fixed IP and HA shows the `sensor.coffee_machine_power` entity.

1. Plug the Shelly into the wall and the coffee machine into the Shelly. On first boot it creates its own Wi-Fi network, named `ShellyPlugMG3-` followed by its ID.
2. Connect your phone or PC to that network and open `http://192.168.33.1`. This is the Shelly factory address and it only works at this stage, while you are connected to the plug's own Wi-Fi network. The Shelly Smart Control app works too, if you prefer.
3. In *Settings → Wi-Fi*, join your home network. Once it is connected, turn off the Shelly's own access point.
4. On your router, reserve a fixed IP for the plug (a DHCP reservation for its MAC address, shown at the bottom of the plug's page). The script and the test use this IP.
5. Reconnect your phone or PC to your home network and open the plug's page at the IP your router gave it, `http://<SHELLY_IP>` (replace `<SHELLY_IP>` with your Shelly's real IP; this is the address used in the rest of the guide). Update the firmware in *Settings → Firmware*. This guide was tested with 2.2.0.
6. In *Settings → Device name*, name it **Coffee Machine**. With this name HA usually creates `sensor.coffee_machine_power`, the entity the package uses, but the ID may come out different. Check the real ID in item 9 and, if it is not this one, follow the note at the end of this step.
7. In *Output → Power on default*, choose **On** or **Restore last**, so the machine is not left without power after an outage.
8. In HA, go to *Settings → Devices & services*. The Shelly integration usually shows up as discovered; click *Configure*. If it does not, add it by hand with the plug's IP.
9. Check in *Developer tools → States* that `sensor.coffee_machine_power` exists and shows power while you make a coffee.

If your entity ended up with a different name, change its entity ID to `sensor.coffee_machine_power` in the entity settings, or change that name in `cafe.yaml`.

## Step 2: prepare Home Assistant

HA has to accept packages and have the two CSV logs the logic writes to.

1. Open `configuration.yaml` and add, if not already there:

```yaml
homeassistant:
  packages: !include_dir_named packages
  allowlist_external_dirs:
    - /config
```

The `packages` and `allowlist_external_dirs` lines are indented two spaces under `homeassistant:`, and `- /config` two more; without that indentation HA rejects the configuration. If your `configuration.yaml` already has a `homeassistant:` section, do not add a second one: add only these lines inside the existing one.

2. Create the `/config/packages/` folder if it does not exist.
3. In *Settings → Devices & services → Add integration*, add the **File** integration twice, as a *Notification*:
   - file `/config/registo_cafes.csv`, name **Registo cafes** (creates `notify.registo_cafes`);
   - file `/config/registo_capsulas.csv`, name **Registo capsulas** (creates `notify.registo_capsulas`).
4. Make sure the HA companion app is installed on your phone and note its notify service: in *Developer tools → Actions*, search for `notify.mobile_app_`. You need it in the next step.

If you do not want CSV logs, skip item 3 and delete the two `notify.send_message` actions that write to those files in `cafe.yaml`.

## Step 3: install the packages

After this step HA has all the coffee counters, helpers, sensors and automations, waiting for drinks.

1. Copy `packages/cafe.yaml` and `packages/cafe_shelly_m.yaml` from the repository into `/config/packages/`.
2. Make up a webhook ID, random and hard to guess, for example `cafe_m_` followed by 20 letters and digits. It works like a password.
3. In `cafe.yaml`, find and replace:

| Find | Replace with | Where it appears |
| --- | --- | --- |
| `<O_TEU_WEBHOOK_ID>` | the ID from item 2 | automation `cafe_registar_bebida` |
| `notify.mobile_app_o_teu_telemovel` | your phone's notify service | 3 alerts: stock, tanks, missed drink |
| `sensor.coffee_machine_power` | only if your entity has another name | energy and power sensors |

4. In *Developer tools → YAML*, click **Check configuration** and fix anything it reports before going on.
5. **Restart Home Assistant.** A reload is not enough: new `counter` entities only appear after a restart.
6. Check in *States* that `counter.cafe_bebidas`, `input_number.cafe_stock_capsulas`, `sensor.cafes_hoje` and `automation.cafe_registar_bebida` exist, among others.

## Step 4: install the script on the plug

The `contador_cafe` script runs inside the Shelly and sends every drink to the webhook from step 3.

1. Open the plug's page (`http://<SHELLY_IP>`) and go to **Scripts** (the `<>` icon in the side bar).
2. Click **Create script** and name it `contador_cafe`.
3. Paste the contents of `shelly/contador_cafe.js` into the editor.
4. On the `let URL = ...` line, put your HA IP and the webhook ID from step 3:

```js
let URL = 'http://192.168.1.50:8123/api/webhook/cafe_m_xxxxxxxxxxxxxxxxxxxx';
```

5. Click **Save**, then **Start**. The button changes to *Stop*, which means the script is running.
6. In the script list, turn on **Run on startup** (the switch next to its name), so the script starts again by itself after a power cut.

The script should be the plug's first, with id 1. If you already had other scripts, the test address in the next step changes to `script/<id>/teste`.

## Step 5: test

If both tests pass, the installation is done.

**Connection test.** Open `http://<SHELLY_IP>/script/1/teste` in a browser. The page answers *teste enviado* and, a few seconds later, HA shows a persistent notification “Teste recebido da tomada da máquina às …”. The test does not count as a drink and does not touch the stock.

**Drink test.** Make a coffee. The plug only sends the drink once the machine has been idle for 10 s, so wait about 30 s after it finishes. Then check:

- `input_text.cafe_ultima` shows the type, time, seconds and Wh of the drink;
- `counter.cafe_bebidas` went up by 1 and `input_number.cafe_stock_capsulas` went down by 1;
- `sensor.cafe_m_ultimos_blocos` has the drink in its `lista` attribute, with the per-second trace in `tr`.

If you switched the machine on just before the coffee, the warm-up shows in `sensor.cafe_m_ultimos_blocos` as *aquecimento* and is not counted. That is expected.

## Step 6: install the dashboard

This step is optional: counting already works without it. It adds the Coffee view with the machine, totals, latest drinks, stock, charts and tanks.

1. Install the **button-card** and **apexcharts-card** cards through HACS (in HA 2026.11 it lives under *Settings → Marketplace*). Reload the browser afterwards.
2. Open the dashboard you want the view in, click the three dots and choose **Edit dashboard → Raw configuration editor**.
3. Under `views:`, paste the contents of `dashboard/coffee-view.yaml` as one more list item, with the same indentation as the other views. Save. For Portuguese labels, paste dashboard/vista-cafe.yaml instead.
4. The file has three `custom:jarvis-popup-card` cards, a personal card that is not published and does not exist in other installations. Before using the dashboard, delete these three cards from the YAML or replace them with cards you have installed. If you leave them, they show up as broken cards.
5. The machine card shows the model, serial number and purchase date. Replace those texts with your own machine's, and the photo if it is a different machine.

The charts only get interesting after a few days of logged drinks.

## Step 7: set thresholds, stock and tanks

Do this right after the restart. Several helpers in the package have no initial value and start at their minimum. The cappuccino threshold, for example, starts at 20 s and 1 Wh, which would turn almost every long coffee into a cappuccino.

Set the values in *Settings → Devices & services → Helpers*, or in the form on the Coffee view:

| Helper | Starting value | What it does |
| --- | --- | --- |
| `input_number.cafe_limite_aquecimento_s` | 15 s (already set) | Less time working than this is just switching the machine on, not counted |
| `input_number.cafe_limite_cappuccino_s` | 35 s | Minimum length of a cappuccino |
| `input_number.cafe_limite_cappuccino_wh` | 13 Wh | Minimum energy of a cappuccino |
| `input_number.cafe_limite_lungo_total_s` | 70 s (already set) | From this length on, without cappuccino energy, it is a lungo |
| `input_number.cafe_stock_capsulas` | the capsules you have | Current stock; each drink takes 1 |
| `input_number.cafe_stock_minimo` | 20 | Below this you get a phone alert, at most once a day |
| `input_number.cafe_limite_deposito_capsulas` | how many capsules your tank holds | Alert to empty it |
| `input_number.cafe_limite_agua` | how many drinks a full water tank makes | Alert to refill it |

The coffee, lungo and cappuccino values fit the Lattissima One Evo. On another machine, make one of each drink, look at the duration and Wh of each in `sensor.cafe_m_ultimos_blocos`, and set the thresholds between the values you see.

The `cafe_limite_lungo_s` and `cafe_arranque_min` helpers belong to the old Plug S version and are no longer used. You can ignore them.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| The test shows no notification in HA | Wrong `URL` in the script, or the script is stopped | Check IP, port and webhook ID; in *Scripts* the button should read *Stop* |
| The test works by IP but not by hostname | The webhook has `local_only: true` | Use HA's local IP in `URL`, never the external address |
| No `counter.cafe_*` entities | HA was reloaded, not restarted | Restart Home Assistant |
| Almost everything counts as cappuccino | Cappuccino thresholds still at their minimum | Set them as in step 7 |
| Phone alert “extração perdida” (missed drink) | HA was down and missed a drink | Wait 5 min: the plug resends it; if the alert stays, fix the count by hand |
| Counting stops after a power cut | The script does not start by itself | Turn on *Run on startup* for the script |
| Nothing is counted | Maintenance mode is on | Turn off `input_boolean.cafe_manutencao`; it turns itself off after 2 h |
| Log errors about `notify.registo_cafes` | The File integration is missing | Do item 3 of step 2, or delete those actions |
| Broken cards on the Coffee view | button-card, apexcharts-card or jarvis-popup-card missing | Install the first two and delete the `custom:jarvis-popup-card` cards |

If counting goes wrong some other way, open the *Traces* of the `cafe_registar_bebida` automation and the `lista` attribute of `sensor.cafe_m_ultimos_blocos`: they show exactly what the plug sent and how it was classified.
