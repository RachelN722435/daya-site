# Daya website

Plain HTML, CSS and JavaScript. No build step.

## Everything you edit is in `js/content.js`

| To do this | Edit this |
|---|---|
| Change the weekly affirmation | `affirmations` list (it moves to the next one every Monday) or type one into `affirmationOverride` |
| Turn on Book / Chat with a stylist | `whatsapp` (digits only, e.g. `2348012345678`) and/or `email` |
| Add, change or remove a look | the `looks` list |
| Add a journal article | copy a block in `articles`, change the `id` and write |

How the home page sections work:
- **Best looks**: looks with `featured: true`
- **Most affordable**: Naira looks, cheapest first
- **Best deals**: looks that have a `was` price, biggest discount first

## Deploying on Vercel

Upload the whole folder (or push it to the repo Vercel is connected to). `vercel.json` makes
`/calculator`, `/looks` etc. work without `.html`.

## Pages

`index.html` home · `looks.html` filtered looks · `journal.html` + `article.html` · `size-chart.html` · `calculator.html` · `stylist.html`
