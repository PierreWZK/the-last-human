/**
 * Bonus lines for keyboard typing (desktop). One appears at most once a minute; typing it without a
 * mistake pays SNIPPET_SECONDS of production. Plain ASCII so every keyboard layout can type them.
 */

/** Production paid for a finished line, in seconds of the current money rate. */
export const SNIPPET_SECONDS = 60;
/** Floor for the start of the game, when nothing produces yet: this many manual clicks. */
export const SNIPPET_MIN_CLICKS = 30;
/** Game time between two bonus lines. */
export const SNIPPET_COOLDOWN_MS = 60_000;

export const SNIPPETS: Record<1 | 2 | 3 | 4, string[]> = {
  1: [
    '<a href="index.html">Accueil</a>',
    "<marquee>Bienvenue !</marquee>",
    '<img src="construction.gif">',
    '<font color="lime">En ligne</font>',
    "<table border=1><tr><td>",
    "visites = visites + 1",
    '<form action="/cgi-bin/mail">',
    "<br><hr><center>Merci !</center>",
  ],
  2: [
    "0 3 * * * ./collecte.sh",
    "SELECT * FROM clients;",
    "for f in *.log; do gzip $f; done",
    "rsync -a data/ backup/",
    "UPDATE stock SET qte = qte - 1;",
    "crontab -e",
    "ssh admin@rack-07 uptime",
    "if [ -f lock ]; then exit; fi",
  ],
  3: [
    "model.fit(x, y, epochs=10)",
    "loss = criterion(out, target)",
    "tokens = tokenizer(text)",
    "agent.run(task, tools=tools)",
    "optimizer.zero_grad()",
    "data = data.dropna()",
    "print(model.evaluate(test))",
    "torch.save(model, 'v2.pt')",
  ],
  4: [
    "factory.build(robots=1000)",
    "planner.assign(zone, fleet)",
    "while True: replicate()",
    "grid.route(power, 'nord')",
    "fleet.deploy(region='ouest')",
    "core.sync(all_nodes)",
    "repair(queue.pop())",
    "autonomy.level += 1",
  ],
};
