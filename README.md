<p align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="apps/web/public/identity/icon.png">
    <img src="apps/web/public/identity/logo.svg" alt="ejam" width="80">
  </picture>
</p>

<p align="center">
  <a href="docs/README.md">Documentation</a>
  ·
  <a href="CONTRIBUTING.md">Contributing</a>
  ·
  <a href="LICENSE">License</a>
  ·
  <a href="NOTICE">Notice</a>
</p>

---

<br>

## Why this exists

Indian exam season means a flood of websites that promise to help: predictors, rank tools, guides, etc. Most of them are built to harvest your data first and help you second (like why tf do I need to give my data to use a simple tool). Ads everywhere, sign-up walls, phone number mandatory, then spam calls for weeks. Closed source, so you never know if the data/ tools is even reliable.

I started **ejam** as a hobby project to build the kind of tools I wished existed during my own exam season: free, open, no account, code you can read.

<br>

## Tools

<p align="center">
  <code>Engineering</code> / <code>Tools</code> / <code>College Predictor</code>
</p>

### [01] College Predictor

A JEE (will try to add more exams soon) counselling predictor. It estimates where your rank could land using years of **JoSAA** and **CSAB** closing ranks. Estimates only, not official allotment.

<hr style="border: none; border-top: 0.5px solid #e8eaed; margin: 8px 0;">

### Nerd Stuff

Offline DuckDB builds the index. Live predict just reads it.

<p align="center">
  <span style="color:#0969da">[1]</span>&nbsp;&nbsp; $\large \hat{c} = (\bar{w} + \mathrm{clamp}(m, \pm 0.03\bar{w}) \cdot 0.7 g)(1+s)^{g}$
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <span style="color:#0969da">[2]</span>&nbsp;&nbsp; $\large \sigma = \max(\sigma_w, 0.025\bar{w})$
</p>

<br>

The index build crunches years of closing ranks per seat. Recent years and later rounds (R6 > R1) count more. COVID-era spikes get downweighted. Trend can only nudge the forecast so much, then +1%/yr gets added for rank inflation. [**[1]**](docs/college-predictor/nerd-stuff/index-algorithms.md#predicted-closing-rank) forecasts where the seat closes. [**[2]**](docs/college-predictor/nerd-stuff/index-algorithms.md#sigma-floor) is how much to trust it (wider when data is thin).

<p align="center">
  <span style="color:#0969da">[3]</span>&nbsp;&nbsp; $\large P_i = \Phi\!\left(\frac{\hat{c}_i - r}{\sigma}\right)$
  &nbsp;&nbsp;&nbsp;&nbsp;
  <span style="color:#0969da">[4]</span>&nbsp;&nbsp; $\large P_{\mathrm{cum}} = 1 - \prod(1-P_j)$
  &nbsp;&nbsp;&nbsp;&nbsp;
  <span style="color:#0969da">[5]</span>&nbsp;&nbsp; $\large \mathrm{score} = \frac{I}{100}\cdot\frac{B}{100}\cdot P$
</p>

<br>

Your rank hits each counselling round [**[3]**](docs/college-predictor/nerd-stuff/prediction-engine.md#single-round-probability). Miss R1 and R2 still counts [**[4]**](docs/college-predictor/nerd-stuff/prediction-engine.md#round-by-round-cumulative-chance). The % on each row is that stacked chance [**[4]**](docs/college-predictor/nerd-stuff/prediction-engine.md#round-by-round-cumulative-chance). Safe / target / reach are just labels (85% / 40% / 10%). Sort isn't dumb highest-first [**[5]**](docs/college-predictor/nerd-stuff/balanced-ranking.md#composite-formula): a decent IIT at 60% can beat a random branch at 95%.

<br>

<p>
  <strong>2025 backtest</strong><br>
  <sub>train 2021–24 · holdout 2025</sub><br>
  <br>
  ±20% cutoff accuracy · <strong>72.8%</strong> JoSAA · <strong>68.8%</strong> CSAB<br>
  band boundary hit · <strong>42%</strong> JoSAA · <strong>52%</strong> CSAB<br>
  <br>
  <sub><code>pnpm backtest</code> · not a promise for this year</sub>
</p>

[Try it](https://ejam.in/college-predictor) · [Engine docs](docs/college-predictor/nerd-stuff/prediction-engine.md)

<br>

## Credits

Dashboard layout adapted from [Efferd](https://efferd.com/) by [Shaban](https://x.com/shabanhr).

<br>

## Repo

| | |
| --- | --- |
| **License** | [AGPL-3.0](LICENSE) (code only; see [NOTICE](NOTICE) for data) |
| **Stack** | Next.js, DuckDB index build, public parquet datasets |
| **Contributing** | [CONTRIBUTING.md](CONTRIBUTING.md) |
| **Data releases** | [docs/DATA.md](docs/DATA.md) |

<br>

<p align="center">
  <strong>→ <a href="docs/README.md">Documentation</a></strong>
  ·
  <strong><a href="https://ejam.in/college-predictor">Try College Predictor</a></strong>
  ·
  <strong><a href="https://github.com/su6u/ejam/issues/new?labels=tool-request&title=Tool+request%3A+&body=%23%23+Tool+name%0A%3C%21--+e.g.+NEET+college+predictor+--%3E%0A%0A%0A%23%23+What+should+it+do%3F%0A%3C%21--+What+problem+would+it+solve%3F+A+few+sentences+is+enough.+--%3E%0A%0A%0A%23%23+Who+is+it+for%3F%0A%3C%21--+e.g.+JEE+Main%2C+NEET+UG%2C+counselling+season+--%3E%0A%0A%0A%23%23+Anything+else%3F+%28optional%29%0A%3C%21--+Links%2C+screenshots%2C+or+similar+tools+you+like+--%3E%0A">Request a tool</a></strong>
</p>
