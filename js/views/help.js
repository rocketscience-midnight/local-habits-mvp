/**
 * Help overlay – explains the app concepts in warm, accessible prose
 */

export function showHelp() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal help-modal">
      <button class="help-close-btn" aria-label="Schließen">✕</button>
      <div class="help-content">

        <div class="help-hero">🌱</div>
        <h2 class="help-title">Willkommen in deinem Garten</h2>

        <p>
          Diese App hilft dir dabei, gute Gewohnheiten aufzubauen – und belohnt dich 
          dafür mit einem kleinen Garten, der mit dir wächst. Keine komplizierten 
          Systeme, keine Accounts, keine Cloud. Alles bleibt auf deinem Gerät, 
          nur für dich.
        </p>

        <h3>☀️ Dein Tag</h3>
        <p>
          Auf dem Heute-Bildschirm siehst du alle Gewohnheiten, die heute anstehen. 
          Einfach antippen, wenn du etwas erledigt hast – fertig. Du kannst 
          Gewohnheiten in Tageszeiten einteilen (morgens, mittags, abends), damit 
          du immer weißt, was als nächstes dran ist. Manche Gewohnheiten kannst du 
          auch mehrfach am Tag abhaken, zum Beispiel "ein Glas Wasser trinken".
        </p>
        <p>
          Oben findest du deinen <strong>Wochenfokus</strong> – ein Satz oder Gedanke, 
          der dich diese Woche begleitet. Vielleicht ein Vorsatz, ein Zitat, oder 
          einfach eine Erinnerung an das, was dir gerade wichtig ist.
        </p>

        <h3>🔥 Streaks</h3>
        <p>
          Jedes Mal, wenn du eine Gewohnheit mehrere Tage hintereinander erledigst, 
          baust du einen Streak auf. Das kleine Feuer-Symbol zeigt dir, wie viele 
          Tage du schon drangeblieben bist. Streaks sind nicht nur motivierend – 
          sie bestimmen auch, welche Pflanzen du für deinen Garten bekommst.
        </p>

        <h3>🌸 Der Garten</h3>
        <p>
          Das Herzstück der App. Jede Woche, in der du bei einer Gewohnheit 
          dranbleibst, bekommst du am Montag eine neue Pflanze geschenkt. 
          Je länger dein Streak, desto seltener und schöner die Pflanze – 
          von kleinen Grashalmen bis zu blühenden Kirschbäumen.
        </p>
        <p>
          Die Pflanzen landen erst in deinem <strong>Inventar</strong>. Von dort 
          kannst du sie antippen und auf einer freien Stelle im Garten platzieren. 
          So gestaltest du deinen Garten ganz nach deinem Geschmack. Jede Pflanze 
          erinnert an den Moment, in dem du drangeblieben bist.
        </p>

        <h3>🔨 Aufgaben</h3>
        <p>
          Neben täglichen Gewohnheiten gibt es auch <strong>Aufgaben</strong> – 
          Dinge, die regelmäßig anfallen, aber nicht jeden Tag: Fenster putzen, 
          den Keller aufräumen, die Steuererklärung. Du legst fest, wie oft 
          sie fällig sind (wöchentlich, monatlich, quartalsweise) und wie 
          schwer sie dir fallen.
        </p>
        <p>
          Mittlere und große Aufgaben belohnen dich mit 
          <strong>Dekorationen</strong> für deinen Garten – Bänke, Laternen, 
          Brunnen oder sogar kleine Windmühlen. So wird aus deinem Garten 
          mit der Zeit ein richtiger kleiner Ort.
        </p>

        <h3>💜 Warum das Ganze?</h3>
        <p>
          Veränderung passiert nicht über Nacht. Sie passiert an den vielen 
          kleinen Tagen, an denen du dich entscheidest, dranzubleiben – auch 
          wenn es sich gerade nicht besonders anfühlt. Dein Garten ist ein 
          Spiegel dieser Tage. Er zeigt dir, dass du mehr geschafft hast, 
          als du denkst.
        </p>

      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  overlay.querySelector('.help-close-btn').addEventListener('click', () => {
    overlay.remove();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
