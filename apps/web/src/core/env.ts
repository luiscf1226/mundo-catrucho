// Ambiente compartido (hora del día y clima). Lo actualiza el SkyRig del arte; lo leen faroles, NPC, etc.
export const env = {
  /** 0..24 */ hour: 10,
  weather: 'despejado' as 'despejado' | 'lluvia' | 'neblina',
  get night() {
    return this.hour < 5.5 || this.hour > 18.5;
  },
};
