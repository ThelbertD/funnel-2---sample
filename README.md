# Founder Freedom · Funnel 2: Freedom by Design Masterclass

A VSL-led live event funnel for Founder Freedom (James Clanfield). Warm traffic registers for a free 90-minute live masterclass, is prepared to show up, attends the live room, and is offered the $97 3-Day Boot Camp, then $2,000 Group Coaching.

## Funnel steps

| # | Page | Purpose |
|---|------|---------|
| 1 | Ads | Four ad hooks pointing to the registration page |
| 2 | Register + VSL | Headline, 90-second video, one button, registration form |
| 3 | Thank-you + VSL | Show-up video, calendar buttons, 2-minute prep checklist |
| 4 | Live room | Stream or Zoom embed with the Boot Camp offer underneath |
| 5 | Boot Camp + VSL | Sales video, the three days, the offer stack ($97) |
| 6 | Checkout | One-step checkout with an optional add-on |
| 7 | Welcome + next tier | Onboarding and the Group Coaching invitation |

Each page links to the next through its own buttons and forms, just like the live funnel. To jump straight to a step, add its name to the URL, for example `#bootcamp`.

## View it

- Open `index.html` in a browser, or
- Serve the folder locally: `python -m http.server 8080`, then open http://localhost:8080, or
- Turn on GitHub Pages (Settings → Pages → Deploy from branch → `main` / root).

## Set the event date

At the bottom of `index.html`, edit the `EVENT` block:

```js
const EVENT = {
  start: "2026-10-27T18:00:00+08:00",  // masterclass start (6pm Singapore time)
  minutes: 90,
  bootcampStart: "2026-11-03T18:00:00+08:00"
};
```

Dates, times (SGT and Sydney) and the calendar buttons all update from this.

## Add the videos

Set the five video slots in `videos.js`:

| Slot | Video |
|------|-------|
| `mc-register` | Registration VSL (90 sec) |
| `mc-thankyou` | Show-up VSL (3 min) |
| `mc-live` | Live stream, Zoom embed or replay |
| `bc-sales` | Boot Camp sales VSL (14 min) |
| `bc-welcome` | Boot Camp welcome (60 sec) |

YouTube, Vimeo, Loom and Wistia links work, or put a file in `videos/` and use `"videos/your-file.mp4"`. You can also click **Add video** on any video card to try a video in your own browser.

## Files

- `index.html`: all funnel pages, copy, event settings and page logic
- `assets/ff.js`, `assets/ff.css`: page router and video cards
- `videos.js`: video settings
