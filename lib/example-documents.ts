export const exampleDocuments = [
  {
    name: "Exemple: ACQUITY-QDa-Detector.pdf",
    content: `
    Guide du détecteur ACQUITY QDa.
    Introduction: Le détecteur ACQUITY QDa est un détecteur de masse conçu pour les analystes en chromatographie.
    Section 2.1: Mise sous tension. Pour mettre l'appareil sous tension, appuyez sur le bouton d'alimentation situé en façade. La LED de statut doit passer au vert. Une LED qui clignote en orange indique un état d'erreur.
    ... (contenu abrégé pour la démo) ...
    `
  },
  {
    name: "Exemple: sample_errors.csv",
    content: `
    Timestamp,ErrorCode,MachineID,Notes
    2024-06-10T10:05:12Z,P-21,LCMS-001,Pressure fluctuated then dropped below threshold. Pump A suspected.
    2024-06-10T11:22:01Z,E-45,LCMS-002,Detector communication failed. Rebooted, issue persists.
    2024-06-10T11:55:43Z,F-12,LCMS-001,Fan speed error. Checked for obstructions, none found.
    2024-06-10T14:30:00Z,P-21,LCMS-001,Pressure fault again. Maintenance scheduled to replace seals on Pump A.
    `
  }
]; 