# Anuncio de ECOS · Gemini / Flow · 3 flyers + 2 videos, con voz

Secuencia: **flyer → video → flyer → video → flyer**. Son 5 clips de 8 s; en
**Flow** (flow.google, misma cuenta del plan) se ponen en fila, se recorta cada
uno a 4–5 s y se descarga un solo video de ~22 s. Formato vertical 9:16 antes
de generar. Si Flow no deja recortar, se le mandan los 5 clips a Claude.

## El guion

| # | Clip | Imagen | La voz dice |
|---|---|---|---|
| 1 | Flyer | `flyer-1-marca.png` | «Aprende las habilidades que hacen crecer tu carrera y tu negocio.» |
| 2 | Video | — | «ECOS Business Club. Escuela de Comunicación, Oratoria y Sentido.» |
| 3 | Flyer | `flyer-2-materias.png` | «Tres materias, una sola habilidad: comunicar. Ventas, marketing y oratoria.» |
| 4 | Video | — | «Únete ahora y crece con la comunidad correcta.» |
| 5 | Flyer | `flyer-3-unete.png` | «Únete a ECOS.» |

La descripción de la voz es **idéntica** en los cinco prompts: así suena el
mismo narrador. Cada prompt pide que la voz hable al principio del clip, para
poder recortar el final sin cortarla.

## Clip 1 · Flyer de la marca (subir `flyer-1-marca.png`)

```
Animate this image. Keep the ECOS plaque and the words "BUSINESS CLUB"
exactly as they are: same letters, same position, perfectly still. Behind the
plaque, thin champagne-gold rounded-square outlines gently expand outward and
fade, like echoes. The warm gold glow breathes softly. Very slow camera
push-in. Dark, cinematic, elegant, premium, soft film grain. Do not add any
new text or subtitles. No people.
Voiceover: a warm, confident male narrator in Latin American Spanish, calm
and elegant, like a mentor, speaks right from the start: "Aprende las
habilidades que hacen crecer tu carrera y tu negocio."
Soft cinematic ambient music underneath, no lyrics.
```

## Clip 2 · Video: alguien habla frente a un grupo (sin imagen)

```
Cinematic vertical 9:16 video. A confident Latina entrepreneur in her
thirties speaks to a small, attentive audience in an elegant, dimly lit room
with warm golden light. Medium shot, slow push-in toward her. She gestures
naturally, calm and sure of herself; people in the audience nod and listen.
Dark navy tones with warm gold highlights, shallow depth of field, soft film
grain, premium commercial look. No text, no subtitles, no logos. Her lips do
not move; the only voice is the narrator.
Voiceover: a warm, confident male narrator in Latin American Spanish, calm
and elegant, like a mentor, speaks right from the start: "ECOS Business
Club. Escuela de Comunicación, Oratoria y Sentido."
Soft cinematic ambient music underneath, no lyrics.
```

## Clip 3 · Flyer de las materias (subir `flyer-2-materias.png`)

```
Animate this image. Keep the three words "Ventas", "Marketing" and
"Oratoria" exactly as they are: same letters, same position, no distortion.
Each word glows softly in turn, from top to bottom, as it is spoken, and the
small gold dots between them pulse gently. The warm gold light in the
background breathes slowly. Dark, cinematic, elegant, premium, soft film
grain. Do not add any new text or subtitles. No people.
Voiceover: a warm, confident male narrator in Latin American Spanish, calm
and elegant, like a mentor, speaks right from the start: "Tres materias, una
sola habilidad: comunicar. Ventas, marketing y oratoria."
Soft cinematic ambient music underneath, no lyrics.
```

## Clip 4 · Video: un taller en grupo (sin imagen)

```
Cinematic vertical 9:16 video. A small workshop of Latin American
entrepreneurs, men and women aged 25 to 50, in a modern room with warm golden
light. Quick elegant moments: a man practices a short speech standing up,
others take notes, the group applauds, two people smile and shake hands.
Natural, warm, inspiring. Dark navy tones with warm gold highlights, shallow
depth of field, soft film grain, premium commercial look. No text, no
subtitles, no logos. Nobody speaks on camera; the only voice is the narrator.
Voiceover: a warm, confident male narrator in Latin American Spanish, calm
and elegant, like a mentor, speaks right from the start: "Únete ahora y crece
con la comunidad correcta."
Soft cinematic ambient music underneath, no lyrics.
```

## Clip 5 · Flyer del cierre (subir `flyer-3-unete.png`)

```
Animate this image. Keep all the text exactly as it is: same letters, same
colors, same position, perfectly still and sharp. Only the light moves: a
slow warm gold glow rises behind the text, and thin gold rounded-square
outlines gently expand from the small ECOS plaque at the top, like echoes.
Very slow camera push-in. Dark, cinematic, elegant, premium, soft film grain.
Do not add any new text or subtitles. No people.
Voiceover: a warm, confident male narrator in Latin American Spanish, calm
and elegant, like a mentor, speaks right from the start: "Únete a ECOS."
Soft cinematic ambient music underneath, ending on one deep resonant note.
No lyrics.
```

## Si algo sale mal

- **La voz cambia de un clip a otro** → vuelve a generar el que desentona.
- **Aparecen letras o subtítulos inventados** → vuelve a generar.
- **Se deforman las letras de un flyer** → vuelve a generar; las imágenes
  llevan pocas palabras y grandes para que Gemini las respete.
