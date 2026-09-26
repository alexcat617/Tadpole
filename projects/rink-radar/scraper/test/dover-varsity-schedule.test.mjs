import assert from 'assert';
import { parseArbiterScheduleHtml } from '../lib/dover-varsity-schedule.mjs';

const fixture = `
<table>
<tbody>
<tr data-gameid="102201583" data-isgame="true">
  <td class="gameRow">
    Sat Feb 6

    12:00 PM
  </td>
  <td><span class="open_400_13px">vs</span></td>
  <td class="bluetd gameRow">
    <div><img alt="Opponent logo" /></div>
    <div><span>Exeter High School</span></div>
  </td>
  <td class="gameRow">
    Dover - Dunaway
    <br />
    <span></span>
  </td>
  <td class="gameRow"><div class="result_"></div></td>
  <td class="gameRow"><abbr title="League">L</abbr></td>
</tr>
<tr data-gameid="102201543" data-isgame="true">
  <td class="gameRow">
    Wed Jan 27

    12:00 PM
  </td>
  <td><span class="open_400_13px">@</span></td>
  <td class="bluetd gameRow">
    <div><span>Salem High School </span></div>
  </td>
  <td class="gameRow">
    Salem High School - NH
    <br />
    <span>Varsity Baseball Field </span>
  </td>
  <td class="gameRow"><div class="result_">3 - 1</div></td>
  <td class="gameRow"><abbr>L</abbr></td>
</tr>
<tr data-gameid="999" data-isgame="true">
  <td class="gameRow">Wed Feb 3

    12:00 AM
  </td>
  <td><span>vs</span></td>
  <td class="gameRow"><span>TBD Opponent</span></td>
  <td class="gameRow">TBD</td>
  <td class="gameRow"></td>
</tr>
</tbody>
</table>
`;

const games = parseArbiterScheduleHtml(fixture, 'boys', 2025, 2026);
assert.equal(games.length, 2, 'skips 12:00 AM placeholder row');

const home = games.find((g) => g.opponent_name === 'Exeter High School');
assert.ok(home, 'parses home game');
assert.equal(home.is_home, true);
assert.equal(home.venue, 'Dover - Dunaway');
assert.equal(home.game_state, 'FUT');
assert.ok(home.starts_at.includes('2026-02-06'), 'Feb uses end-year in NH season');

const away = games.find((g) => g.opponent_name.includes('Salem'));
assert.ok(away, 'parses away game');
assert.equal(away.is_home, false);
assert.equal(away.game_state, 'FINAL');
assert.equal(away.id, 'boys-102201543');

console.log('dover-varsity-schedule tests passed');
