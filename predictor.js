// Liste de multiplicateurs pondérés (valeurs fréquentes puis rares)
const weightedMultipliers = [
  1.01, 1.05, 1.08, 1.12, 1.19, 1.25, 1.38, 1.43, 1.52, 1.66, 1.78, 1.89,
  2.01, 2.09, 2.25, 2.34, 2.48, 2.59,
  5.09,
  // Valeurs plus rares (effet surprise)
  3.11, 4.26, 5.71, 6.33, 8.44, 10.56, 12.75, 15.3, 18.9, 21.4, 23.65, 27.89
]

// Création d’une liste pondérée : + de chances pour les petits multiplicateurs
const weightedList = [
  ...Array(25).fill(0).map(() => Number((1.0 + Math.random() * 0.89).toFixed(2))), // 25 x entre 1.00 et 1.89
  ...Array(20).fill(0).map(() => Number((2.0 + Math.random() * 0.59).toFixed(2))), // 20 x entre 2.00 et 2.59
  ...Array(5).fill(5.09), // Valeur particulière répétée
  ...weightedMultipliers // Ajout des valeurs pré-définies
]

// Fonction pour choisir une valeur aléatoire dans la liste pondérée
function getRandomPrediction() {
  const randomValue = weightedList[Math.floor(Math.random() * weightedList.length)]
  return Number(randomValue.toFixed(2))
}

// Fonction principale exportée : retourne une prédiction stylée
function generateStyledMultiplier() {
  const multiplier = getRandomPrediction()
  const [integerPart, decimalPart = '00'] = multiplier.toString().split('.')

  const styled = `*🎯 Prédiction Aviator :*\n\n👉 *[${integerPart}.${decimalPart.padEnd(2, '0')}]x* ❌`

  return {
    value: multiplier,
    styled
  }
}

module.exports = generateStyledMultiplier
