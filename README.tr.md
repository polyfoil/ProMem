**Dil / Language:** [English](README.md) · **Türkçe**

# ProMem — Proje Belleği Çerçevesi

[![tests](https://github.com/polyfoil/ProMem/actions/workflows/test.yml/badge.svg)](https://github.com/polyfoil/ProMem/actions/workflows/test.yml)

> **Bellek ajana değil, projeye aittir.**

ProMem, yazılım projeleri için bütünsel bir bellek katmanıdır. Claude, Cursor, Copilot, Codex veya sonraki herhangi bir modele, kodun yanında duran kalıcı bir ikinci beyin vererek projenin tamamını hemen kavramasını sağlar.

---

## Felsefe ve köken

ProMem üç sütun üzerine kuruludur:

### 1. Teşekkür (OpenWolf esini)
ProMem, bir yapay zekâya kalıcı `.wolf` bellek klasörü (`Memory.md`, `Cerebrum.md`) veren [OpenWolf](https://github.com/cytostack/openwolf) protokolünden derinlemesine esinlendi. O fikri endüstrileştirdik: OpenWolf elle not tutma protokolüyken ProMem katı, otomatik bir **5 katmanlı orkestrasyon** çerçevesidir. Dosyaları elle oluşturmak yerine CLI iskelesi, ajan yarışlarını önleyen kilit ve gürültüyü (vardiya defteri) sinyalden (mimari) ayırma var.

### 2. Sıfır bağımlılık, salt JS
ProMem tam olarak sıfır `node_modules` ister. Yalnızca yerleşik Node.js (`fs`, `path`) ve düz Markdown (`.md`) kullanılır.
- **Sürtünmesiz:** Klonlayıp herhangi bir makinede veya CI’de `npm install` olmadan çalıştırın.
- **Güvenli:** Harici paket yok = tedarik zinciri yüzeyi yok.
- **Evrensel:** Markdown her LLM’in anadilidir. Ajanın projenin belleğini okuması için özel bir veritabanı API’si gerekmez.

### 3. Gerçek token ekonomisi (fiziksel sınır)
Birçok araç tahmini panolarla token savunduğunu söyler. ProMem kısıtı dosya sisteminde uygular:
- **Kör tarama yok:** Ajanlar binlerce dosyada `ls -R` / `grep` koşmaz. Bir kez ~2.000 token’lık `Anatomy.md` dizinini okur, gereken dosyaya atlar.
- **Bağlam şişmesi yok:** `pm compact` defteri `Archive/` altına taşır; ajan bunu kısa bir “şimdiye kadarki hikâye” özetine indirger. CLI, `Memory.md` birkaç yüz satırı aşınca uyarır. Ajan yalnızca *bugün* gerekeni okur.

---

## Sorun

Her yeni oturumda projeyi yeniden anlatırsınız. Ajan değişince bağlam kaybolur. Mimari kararlar sohbet günlüklerinde yok olur. Sonraki ajan sıfırdan başlar.

Mevcut bellek çözümleri (`.cursor-rules`, ajan bellek dosyaları) yalnızca **geliştirme sırasında olanı** tutar. Günlük tutarlar — beyin değildirler.

## Çözüm

ProMem, projenin içinde *neden var olduğundan* *bugün ne olduğuna* kadar uzanan **5 katmanlı** bir bilgi yapısı kurar:

```
.pm/
├── 01_Foundations/    → Brief, Vizyon, Hedef kitle
├── 02_Planning/       → Yol haritası, Backlog
├── 03_Specifications/ → Mimari, API sözleşmeleri, UI/UX
├── 04_Execution/      → Anatomy (dizin), Cerebrum (kurallar), Memory (vardiya defteri)
└── 05_Resources/      → Rakipler, Esinler
```

Herhangi bir ajan `.pm/` okuyunca hemen üretkendir. Yeniden anlatım, kayıp bağlam, boşa token yok.

---

## ProMem gerçekte nedir

- **Ajan için ilişkisel bellek:** SQL yerine birbirine bağlı Markdown — LLM’lerin anladığı bir bilgi grafı.
- **Ajan davranış protokolü:** Okuma, yazma ve devir kurallarını dayatır. Yarışları ve bağlam şişmesini keser.
- **Bilişsel geliştirme tarihi:** Git *neyin* değiştiğini tutar; ProMem *neden* değiştiğini, ne öğrenildiğini (Cerebrum) ve ne kaldığını (Memory/Backlog) tutar.

---

## Hızlı başlangıç

### 1. Global CLI (terminal)
Repoyu makinede merkezi bir yere klonlayıp global bağlayın. Böylece her proje klasöründen ProMem komutları çalışır.

```bash
git clone https://github.com/polyfoil/ProMem.git ~/ProMem
cd ~/ProMem
npm link
```

Veya önce yerel klon olmadan GitHub’dan kurun:

```bash
npm install -g github:polyfoil/ProMem
```

Her iki yolda da `pm` (ve `promem`) sistem genelinde vardır. npm registry paketi henüz yok; kurulum kaynağı GitHub’dır.

### 2. Merkezi skill merkezi (ajanlar için)
Klon **tek kaynaktır**. Skill dosyalarını her ajan klasörüne kopyalamak yerine bir kez bağlayın:

```bash
pm link
```

`pm link` yüklü ajanları bulur ve `pm-*` skill’lerini skill dizinlerine bağlar. **Yıkıcı değildir** (var olan girdilere dokunulmaz) ve **yönetici hakkı gerekmez** (Windows’ta junction, macOS/Linux’ta symlink).

| Ajan | Skills dizini |
|------|----------------|
| Claude Code | `~/.claude/skills/` |
| Codex | `~/.codex/skills/` |
| Gemini / Antigravity | `~/.gemini/config/skills/` |
| Cursor | `~/.cursor/skills/` |
| Genel (AGENTS.md) | `~/.agents/skills/` |

Bunlar kopya değil bağlantıdır — klonda bir `git pull` tüm ajanları günceller.

**Elle kontrol mü?** `<klon>/skills/` altını ajanınızın skill dizinine kendiniz gösterin:

```bash
ln -s ~/ProMem/skills/pm-* ~/.claude/skills/        # macOS / Linux
```
```powershell
# Windows — junction yönetici istemez:
Get-ChildItem "$env:USERPROFILE\ProMem\skills" -Directory | ForEach-Object {
  New-Item -ItemType Junction -Path "$env:USERPROFILE\.claude\skills\$($_.Name)" -Target $_.FullName
}
```

> Bağlantılar diskindeki klon yolunu gösterir. Klonu taşırsanız veya silerseniz bağlantılar körleşir — yeniden klonlayıp `pm link` çalıştırın. Ajan skill dizini alışılmadık bir yerdeyse tabloyu kullanmayın; elle kurun.

### 3. Projede başlatma
Kalıcı bellek istediğiniz proje dizinine gidin. Ajan veya CLI:

**A — Ajan**
Aktif ajana:
```text
"Run pm-init on this project."
```
Ajan kodu tarar, `.pm/` oluşturur, şablonları doldurur.

**B — CLI**
```bash
# Bu dizinde ProMem başlat:
pm init

# Yapı değişince Anatomy/Architecture/Buglog yenile:
pm update

# Elle devir kaydı:
pm memory "Kullanıcı giriş uç noktası eklendi"

# Defteri sıkıştırmaya hazırla (özeti ajan bitirir):
pm compact

# Sağlık kontrolü ve yapı onarımı:
pm status

# Otomatik güncelleme için git post-commit kancası:
pm hook

# İsteğe bağlı Claude Code ajan kancaları:
pm hook claude
```

*`pm hook`, ProMem kurulumunun mutlak yolunu kancaya yedek olarak gömer; `pm` PATH’te olmasa da (GUI git, CI) otomatik güncelleme çalışır.*

### Ajan kancası (isteğe bağlı, Claude Code)

`pm hook claude` projenin `.claude/settings.json` dosyasına dört kanca ekler (var olan girdilere dokunulmaz). İşleri **`.pm/` beynini taze tutmak ve oturum devrini otomatikleştirmek** — token tasarrufu yan etkidir:

| Olay | Ne yapar |
|------|----------|
| `SessionStart` | Son Memory TX + Cerebrum kural başlıklarını oturum bağlamına basar |
| `Stop` | Dosya düzenlenmiş ama Memory TX yoksa hatırlatır; beyin bayatsa Anatomy/Architecture’ı bir kez yeniler |
| `PostToolUse` (Write\|Edit) | Beyni bayat işaretler, düzenlenen dosyaları geçici `.pm/.session.json` içinde tutar |
| `PreToolUse` (Read) | Anatomy’de açıklama varsa tek satır basar |

Kancalar her zaman 0 ile çıkar; hata olursa sessiz no-op olur — asıl işi asla kilitlemez. Kanca yokken ProMem aynı davranır. `.pm/.session.json` dosyasını `.gitignore`’a ekleyin.

Kamu sözleşmesi: [spec/hook-behavior.md](spec/hook-behavior.md).

---

## Temel kavramlar

### Ajan belleği ve proje belleği

| | Ajan belleği | Proje belleği |
|---|---|---|
| **Kapsam** | Bir sohbet oturumu | Projenin tüm ömrü |
| **Kalıcılık** | Oturum bitince gider | Diskte kalıcı |
| **Taşınabilirlik** | Bir satıcıya kilitli | Her ajan, her insan |
| **Token maliyeti** | Her oturumda yeniden anlat | Bir kez oku, hemen çalış |

### Proje başına bir beyin
`pm` proje içindeki herhangi bir dizinden çalışır. Komutlar yukarı yürüyerek `.pm/` (veya `ProMem/`) bulur, git sınırında durur. **Git worktree** içinde gitignore’lı beyin fiziksel olarak yoktur; komutlar ana checkout’un beynine çözülür. `pm init` çözülebilir bir beyin varken ikincisini oluşturmayı reddeder.

### Dizine dayalı token ekonomisi
Ajan tüm kod tabanını okumaz. `Anatomy.md` kompakt bir dizindir (~2.000 token). Ajan dizine bakıp yalnızca gerekeni okur. **2.500 token, 100.000+ değil.**

### Sıralı devir (vardiya defteri)
Bir ajanın kotası bitince `Memory.md`’ye devir notu yazar. Sonraki ajan son kaydı okur ve kaldığı yerden devam eder.

Her kayıt sıralı bir işlem kimliği taşır (`TX-0042`). `Cerebrum.md`, `Buglog.md` ve `ADR.md` bu olaya (`Source: TX-0042`) atıfta bulunabilir.

### Elle sıkıştırma
`Memory.md` büyüyünce `pm compact` defteri `Archive/` altına bekleyen dosya olarak koyar; ajan (`pm-compact` skill) kalıcı dersleri `Cerebrum.md`’ye taşır, taze `Memory.md`’ye özet yazar, arşivi kapatır.

---

## Skill’ler

| Skill | Amaç |
|-------|------|
| `pm-protocol` | İşlemi sahiplenen skill’e yönlendiren işletim protokolü |
| `pm-init` | Projeyi tarayıp `.pm/` ve şablonları oluşturur |
| `pm-memory` | Vardiya defterini (devir kayıtları) yönetir |
| `pm-compact` | Elle bellek sıkıştırma (terfi, arşiv, temizlik) |
| `pm-query` | `.pm/` okuyup proje sorularını yanıtlar |
| `pm-analyze` | 5 sütunlu mimari/kalite denetimi; rapor `.pm/05_Resources/Analysis/` |
| `pm-optimize` | Karmaşıklığı analiz edip ProMem’e yazar |
| `pm-brainstorm` | ProMem’e hizalı gereksinim ve tasarım rafineri |
| `pm-migrate` | Tek yönlü OpenWolf (`.wolf`) → ProMem göçü |

<!-- The rows above are pinned to the skills/ directory listing by
     tests/format-lint.test.js — add the row when you add the skill. -->

Her skill Unix felsefesini izler: bir işi iyi yap, aynı G/Ç’yi paylaş (`.pm/`).

---

## Nasıl çalışır

Ajan her dosya okumasını kesen bir vekil değildir. İyi düzenlenmiş bir kütüphanedir; ajanlar onu kendileri danışır.

```text
Yeni oturum: "Giriş uç noktası ekle"
    ↓
Ajan .pm/01_Foundations/Brief.md okur (hedef)
    ↓
Ajan .pm/04_Execution/Cerebrum.md okur (geçmiş hatalar ve kurallar)
    ↓
Ajan .pm/04_Execution/Anatomy.md’ye bakar (hangi dosyalar)
    ↓
Kod yazar, işi bitirir
    ↓
git commit
    ↓
ProMem git kancası (Anatomy ve Architecture’ı sessiz günceller)
    ↓
Ajan `pm memory` (sonraki oturum için kaydeder)
```

---

## Katkı

[CONTRIBUTING.md](CONTRIBUTING.md). Güvenlik: [SECURITY.md](SECURITY.md).
Ajan kancası sözleşmesi: [spec/hook-behavior.md](spec/hook-behavior.md).

## Lisans

[MIT](LICENSE)
