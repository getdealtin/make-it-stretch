// Screen text added with the Austin engine (Nov 2026), in English and Spanish.
//
// Owner decision (Nov 11 2026): every new piece of screen text is added in English and Spanish as it's
// written; the rest of the site is translated later, and only then does the main tool get an EN/ES
// switch (so no screen shows half Spanish). Until then the main tool shows English; the
// "How your plan is made" page already switches. test/i18n.test.js fails if a key is missing in Spanish.
//
// Where the Austin build already says the same thing, its wording and Spanish are reused. Spanish is a
// draft until a native speaker reviews it. {name} is replaced with a value; keep the braces as they are.
(function () {
  const STRINGS = {
    en: {
      // Intake: foods to leave out and diets
      avoid_pork: 'No pork',
      pref_diet: 'Do you follow any of these diets?',
      diet_hint: 'We change the meals to fit. Your plan says what we changed.',
      diet_halal: 'Halal',
      diet_kosher: 'Kosher',
      diet_diabetic: 'Less sugar (diabetes)',
      diet_low_sodium: 'Low sodium',
      calc_meals: 'Planning your meals...',
      calc_list: 'Building your list from your meals...',

      // Plan summary
      res_desc: 'Your {budget} feeds {people} for {days}: {pppd} a person a day, about {ppmeal} a meal. Your list costs {spent}.',
      person_1: '1 person',
      people_n: '{n} people',
      day_1: '1 day',
      days_n: '{n} days',
      cal_ok: 'Enough for about 2,000 calories a day per person.',
      cal_low: 'About {kcal} calories a day per person, a little under 2,000. The free food programs below can fill the gap.',
      cal_tight: 'About {kcal} calories a day per person. This is a tight budget. The free food programs below can help stretch it.',
      left_over: '{remaining} left over. It’s yours: we don’t spend it on piles of one food.',
      cover_note: 'Your budget covers meals for {n} of {days} days. For the other days, see free food and SNAP under Programs That Can Help.',
      repeat_note: 'With this budget, some foods show up in a lot of meals. Free food from a food bank can add variety and stretch your money.',
      over_note: 'The meals you chose cost {amount} more than your budget. Switch a meal back to fit.',
      find_free_food: 'Find free food near you',
      rules_line: 'Every plan follows the same 11 rules.',
      rules_link: 'How your plan is made →',
      diet_note_halal: 'Halal: no pork in your meals or list. Buy halal-certified meat where you shop; we can’t check that for you.',
      diet_note_kosher: 'Kosher: no pork, and no meal mixes meat with dairy. Look for a kosher symbol on packages; we can’t check that for you.',
      diet_note_diabetic: 'Less sugar: we left out dried mango and canned peaches (often packed in syrup). This isn’t a medical meal plan. Ask your doctor or a dietitian how much rice, pasta, bread and other starch is right for you.',
      diet_note_low_sodium: 'Low sodium: we left out soy sauce, canned soup and chili, broth, salsa and hot sauce. Use little or no salt, rinse canned beans, and look for “no salt added” cans.',

      // Meal plan
      meals_intro: 'Each meal has one swap that keeps the plan in budget. Tap it and your shopping list changes to match. Tap 📖 for the recipe.',
      swap_pill: 'SWAP',
      swap_title: 'Swap to {title}',
      day_uncovered: 'Not covered by this budget. See free food and SNAP under Programs That Can Help.',
      week_days: '{n} days',
      ideas_pill: 'IDEAS',
      swapped_list: 'Swapped in {title}. Your shopping list is updated.',
      twists_title: 'Ways to change it up',
      twists_hint: 'This meal comes up {n} times. Each idea uses only foods already on your list.',

      // Shopping list
      list_subtitle: 'Everything your meals need, in the amounts they use. Check off as you shop.',
      list_week: 'Week {n} shopping',
      list_full_note: '{n} items. Want a shorter list? We’ll repeat fewer different meals, so there’s less to buy.',
      list_show_short: 'Show a shorter list',
      list_short_note: 'Shorter list: {n} items instead of {total}, with fewer different meals.',
      list_show_full: 'Show the full list',
      have_note: 'From your kitchen: {items}.',
      list_left: '{remaining} left over: not spent on piles of one food.',

      // Recipes (NHLBI main dishes are printed as published, with credit)
      serves: 'Serves {n}',
      need_tag: 'You’ll also need',
      nih_credit: 'From “{book},” page {page}, by the National Heart, Lung, and Blood Institute (NHLBI), National Institutes of Health, U.S. Department of Health and Human Services. Printed as published. Its use here does not mean NHLBI endorses this site.',
      nih_book_latino: 'Delicious Heart-Healthy Latino Recipes',
      nih_book_aa: 'Heart-Healthy Home Cooking African American Style',
      nih_official_es: 'Spanish text as published by NHLBI.',
      nih_our_translation: 'Translated by Make It Stretch (draft); the original is in English.',

      // How your plan is made (footer, About, and its own page)
      plan_h: 'How your plan is made',
      plan_p1: 'Enough food first: about 2,000 calories a day for each person',
      plan_p2: 'Filling, healthy meals that follow federal nutrition guidance when the budget allows',
      plan_p3: 'Every meal comes from your list, and nothing you leave out',
      plan_p4: 'Different meals from the same groceries, never piles of one food',
      plan_p5: 'Honest when money is short, with free food nearby',
      plan_link: 'See every rule we follow',
      rules_eyebrow: 'Make It Stretch · Our rules',
      promises_h: 'Our five promises',
      rules_h: 'Every rule, in order',
      rules_build: 'Build my game plan →',
      about_link: 'About & Data Sources',
      lang_label: 'Language',
      // About page: the meal plan card
      about_meta: 'USDA · NHLBI · 208 Recipes · Same engine as the Austin build',
      about_card_h: 'Meals first, then the shopping list',
      about_card_p1: 'The planner picks meals first, then buys only what those meals use, in the amounts they use. It aims for about 2,000 calories a day per person (USDA’s reference), then more filling meals, and federal nutrition guidance when the budget allows. If money is left over, the plan shows it instead of spending it on piles of one food.',
      about_card_p2: 'Recipes: 161 budget dishes across American, Latin, Asian, Southern and Mediterranean cooking; 22 simple everyday meals from the cheapest staples; and 25 main dishes printed word for word from two public-domain NHLBI cookbooks, with their own amounts and credit. No AI is used: the same answers always give the same plan.',
      about_card_link: 'How your plan is made: every rule we follow →',
    },
    es: {
      avoid_pork: 'Sin cerdo',
      pref_diet: '¿Sigue alguna de estas dietas?',
      diet_hint: 'Cambiamos las comidas para que le sirvan. Su plan dice qué cambiamos.',
      diet_halal: 'Halal',
      diet_kosher: 'Kosher',
      diet_diabetic: 'Menos azúcar (diabetes)',
      diet_low_sodium: 'Bajo en sodio',
      calc_meals: 'Planeando sus comidas...',
      calc_list: 'Armando su lista con sus comidas...',

      res_desc: 'Sus {budget} alimentan a {people} por {days}: {pppd} por persona al día, unos {ppmeal} por comida. Su lista cuesta {spent}.',
      person_1: '1 persona',
      people_n: '{n} personas',
      day_1: '1 día',
      days_n: '{n} días',
      cal_ok: 'Alcanza para unas 2,000 calorías al día por persona.',
      cal_low: 'Unas {kcal} calorías al día por persona, un poco menos de 2,000. Los programas de comida gratis de abajo pueden ayudar.',
      cal_tight: 'Unas {kcal} calorías al día por persona. Es un presupuesto ajustado. Los programas de comida gratis de abajo pueden ayudar a que le rinda más.',
      left_over: 'Le sobran {remaining}. Son suyos: no los gastamos en montones de un solo alimento.',
      cover_note: 'Su presupuesto alcanza para las comidas de {n} de {days} días. Para los otros días, vea comida gratis y SNAP en Programas que pueden ayudar.',
      repeat_note: 'Con este presupuesto, algunos alimentos se repiten en muchas comidas. La comida gratis de un banco de comida puede dar más variedad y hacer rendir su dinero.',
      over_note: 'Las comidas que eligió cuestan {amount} más que su presupuesto. Vuelva a cambiar una comida para que alcance.',
      find_free_food: 'Encontrar comida gratis cerca',
      rules_line: 'Todos los planes siguen las mismas 11 reglas.',
      rules_link: 'Cómo se hace su plan →',
      diet_note_halal: 'Halal: no hay cerdo en sus comidas ni en su lista. Compre carne con certificación halal donde compra; nosotros no podemos verificarlo.',
      diet_note_kosher: 'Kosher: no hay cerdo, y ninguna comida mezcla carne con lácteos. Busque el símbolo kosher en los paquetes; nosotros no podemos verificarlo.',
      diet_note_diabetic: 'Menos azúcar: dejamos fuera el mango seco y los duraznos en lata (que suelen venir en almíbar). Este no es un plan de comidas médico. Pregunte a su doctor o a un dietista cuánto arroz, pasta, pan y otros almidones le conviene.',
      diet_note_low_sodium: 'Bajo en sodio: dejamos fuera la salsa de soya, la sopa y el chili en lata, el caldo, la salsa y la salsa picante. Use poca o nada de sal, enjuague los frijoles de lata y busque latas “sin sal agregada”.',

      meals_intro: 'Cada comida tiene un cambio que mantiene el plan dentro del presupuesto. Tóquelo y su lista de compras cambia para que coincida. Toque 📖 para ver la receta.',
      swap_pill: 'CAMBIAR',
      swap_title: 'Cambiar a {title}',
      day_uncovered: 'El presupuesto no alcanza para este día. Vea comida gratis y SNAP en Programas que pueden ayudar.',
      week_days: '{n} días',
      ideas_pill: 'IDEAS',
      swapped_list: 'Cambiado a {title}. Su lista de compras está actualizada.',
      twists_title: 'Ideas para variar',
      twists_hint: 'Esta comida se repite {n} veces. Cada idea usa solo alimentos que ya están en su lista.',

      list_subtitle: 'Todo lo que necesitan sus comidas, en las cantidades que usan. Márquelo mientras compra.',
      list_week: 'Compras de la semana {n}',
      list_full_note: '{n} cosas. ¿Quiere una lista más corta? Repetimos menos comidas distintas, así hay menos que comprar.',
      list_show_short: 'Ver una lista más corta',
      list_short_note: 'Lista más corta: {n} cosas en vez de {total}, con menos comidas distintas.',
      list_show_full: 'Ver la lista completa',
      have_note: 'De su cocina: {items}.',
      list_left: 'Le sobran {remaining}: no se gastan en montones de un solo alimento.',

      serves: 'Para {n} personas',
      need_tag: 'También necesita',
      nih_credit: 'De “{book}”, página {page}, del Instituto Nacional del Corazón, los Pulmones y la Sangre (NHLBI), Institutos Nacionales de la Salud, Departamento de Salud y Servicios Humanos de EE. UU. Tal como se publicó. Su uso aquí no significa que el NHLBI respalde este sitio.',
      nih_book_latino: 'Platillos latinos ¡sabrosos y saludables!',
      nih_book_aa: 'Heart-Healthy Home Cooking African American Style',
      nih_official_es: 'Texto en español publicado por el NHLBI.',
      nih_our_translation: 'Traducción de Make It Stretch (borrador); el original está en inglés.',

      plan_h: 'Cómo se hace su plan',
      plan_p1: 'Primero, suficiente comida: unas 2,000 calorías al día por persona',
      plan_p2: 'Comidas que llenan y son saludables, según las guías federales de nutrición cuando el presupuesto alcanza',
      plan_p3: 'Cada comida sale de su lista, y nada de lo que no come',
      plan_p4: 'Comidas distintas con los mismos alimentos, nunca montones de uno solo',
      plan_p5: 'Honestos cuando el dinero no alcanza, con comida gratis cerca',
      plan_link: 'Vea todas las reglas que seguimos',
      rules_eyebrow: 'Make It Stretch · Nuestras reglas',
      promises_h: 'Nuestras cinco promesas',
      rules_h: 'Todas las reglas, en orden',
      rules_build: 'Armar mi plan →',
      about_link: 'Acerca de y fuentes de datos',
      lang_label: 'Idioma',
      about_meta: 'USDA · NHLBI · 208 recetas · El mismo motor que la versión de Austin',
      about_card_h: 'Primero las comidas, después la lista de compras',
      about_card_p1: 'El planificador elige primero las comidas y luego compra solo lo que esas comidas usan, en las cantidades que usan. Busca unas 2,000 calorías al día por persona (la referencia del USDA), luego comidas que llenen más, y las guías federales de nutrición cuando el presupuesto alcanza. Si sobra dinero, el plan lo muestra en vez de gastarlo en montones de un solo alimento.',
      about_card_p2: 'Recetas: 161 platillos económicos de cocina americana, latina, asiática, sureña y mediterránea; 22 comidas sencillas de todos los días con los alimentos básicos más baratos; y 25 platos principales copiados palabra por palabra de dos recetarios del NHLBI de dominio público, con sus propias cantidades y crédito. No se usa inteligencia artificial: las mismas respuestas siempre dan el mismo plan.',
      about_card_link: 'Cómo se hace su plan: todas las reglas que seguimos →',
    },
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /** Text for a key, with {name} values filled in. lang defaults to English (the main tool's language for now). */
  function t(key, vars = {}, lang = 'en') {
    const s = (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.en[key] ?? key;
    return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  }
  /** Same, HTML-escaped, with the values in <strong> (values are escaped too). */
  function tHtml(key, vars = {}, lang = 'en') {
    const s = esc((STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.en[key] ?? key);
    return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? `<strong>${esc(vars[k])}</strong>` : m));
  }
  const api = { STRINGS, t, tHtml, esc };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.MIS_I18N = api;
})();
