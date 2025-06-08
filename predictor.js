// Liste de multiplicateurs spécifiques : courants + rares (effet surprise)
const predefinedMultipliers = [
  1.01, 1.05, 1.08, 1.12, 1.19, 1.25, 1.38, 1.43, 1.52, 1.66, 1.78, 1.89,
  2.01, 2.09, 2.25, 2.34, 2.48, 2.59,
  3.11, 4.26, 5.09, 5.71, 6.33, 8.44, 10.56, 12.75, 15.3, 18.9, 21.4, 23.65, 27.89
];

// Création de la liste pondérée (petits multiplicateurs majoritaires)
const weightedList = [
  ...Array(25).fill().map(() => Number((1.00 + Math.random() * 0.89).toFixed(2))), // entre 1.00 et 1.89
  ...Array(20).fill().map(() => Number((2.00 + Math.random() * 0.59).toFixed(2))), // entre 2.00 et 2.59
  ...Array(5).fill(5.09), // Valeur semi-symbolique fréquente
  ...predefinedMultipliers
];

// Sélection aléatoire dans la liste pondérée
function getRandomPrediction() {
  const randomIndex = Math.floor(Math.random() * weightedList.length);
  return Number(weightedList[randomIndex].toFixed(2));
}

// Fonction principale : retourne une prédiction stylée
function generateStyledMultiplier() {
  const multiplier = getRandomPrediction();
  const [intPart, decPart = '00'] = multiplier.toString().split('.');

  const styled = `*🎯 Prédiction Aviator :*\n\n👉 *[${intPart}.${decPart.padEnd(2, '0')}]x* ❌`;

  return {
    value: multiplier,
    styled
  };
}

module.exports = generateStyledMultiplier;
