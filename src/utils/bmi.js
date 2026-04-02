
// utils/bmi.js
export const calcBMI = (heightCm, weightKg) => {
  const h = Number(heightCm) / 100;
  const w = Number(weightKg);
  if (!h || !w || h <= 0 || w <= 0) return null;
  return +(w / (h * h)).toFixed(2);
};

export const bmiStatus = (bmi) => {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
};

export const bmiLabelVi = (status) => {
  if (status === 'underweight') return 'Thiếu cân';
  if (status === 'normal') return 'Bình thường';
  if (status === 'overweight') return 'Thừa cân';
  return 'Béo phì';
};