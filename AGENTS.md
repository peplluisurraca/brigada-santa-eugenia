# Normes per a Agents d'IA (Antigravity / Claude Code) — Brigada Santa Eugènia

1. **No tocar producció:** No modificar directament la base de dades de producció ni desplegar automàticament a Firebase Hosting (`firebase deploy`). El desplegament a producció és manual i el valida una persona.
2. **Desenvolupament per fases i branques:** Cada fase del pla (`PLAN_ANTIGRAVITY.md`) es treballa en una branca dedicada (`fix/fase-N`) amb un commit atòmic verificat.
3. **Pla d'implementació previ:** Presentar sempre el pla d'implementació abans d'executar canvis i esperar conformitat de l'usuari.
4. **Idioma de la interfície:** Tota la interfície d'usuari, missatges, etiquetes i informes han d'estar redactats estrictament en **català normatiu** (`ca`), sense mescles amb castellà ni castellanismes.
5. **Seguretat i escapament d'HTML:** Mai interpolar variables d'usuari directament a `innerHTML` sense escapament (`esc(str)`) per prevenir atacs XSS. No passar cadenes lliures dins atributs `onclick`.
6. **Autonomia i proves:** Verificar cada fase amb l'emulador local de Firebase o proves automatitzades abans de donar-la per tancada.
