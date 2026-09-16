// This is just an example,
// so you can safely delete all default props below

export default {
  failed: 'Action failed',
  success: 'Action was successful',
  login: {
    google: 'Продолжить с Google',
  },
  lobby: {
    create: 'Создать игру',
    createTitle: 'Создать игру',
    createConfirm: 'Создать',
    createCancel: 'Отмена',
    maxSeats: 'Число мест',
    maxSeatsOption: '{n}',
    capacity: '{seats}/{maxSeats}',
  },
  game: {
    say: {
      affordance: 'Сказать',
      hello: 'Всем привет',
      luck: 'Удачи',
      ready: 'Готов начать!',
    },
    readyButton: 'Готов начать',
    countdownSoon: 'Игра скоро начнётся',
    leave: 'Выход из игры',
    leaveConfirm: 'Вы уверены? Если выйдете, прогресс будет сброшен.',
    leaveCancel: 'Отмена',
    leaveExit: 'Выйти',
    /** Place modal after all four pieces finish (SC-FINISH-03/04). */
    finishPlaceModal: 'Вы {n}-й!',
    finishPlaceModalOk: 'ОК',
    /** Solo budget expiry — tourists not finished in time (SC-MOVE-31). */
    timeExpiredModal: 'Вы не успели довести туристов до финиша вовремя.',
    timeExpiredModalOk: 'ОК',
    /** a11y for strip finish icon and presence place badge. */
    finishStripAria: 'Финиш',
    finishPlaceBadgeAria: 'Место {n}',
    /** Own private step/peek counters (SC-PRESENCE-15/16). */
    stepsCounterAria: 'Шаги',
    peeksCounterAria: 'Просмотры',
    budgetInfinity: '∞',
    /** Multiplayer end-turn beside own marker (SC-PRESENCE-17/18). */
    endTurn: 'Завершить ход',
    /** Peek modal — reward amount + Correct/Wrong (SC-BOARD-08/09). */
    peekModal: 'Под плиткой награда: {n}. Ответьте правильно, чтобы получить шаги.',
    peekCorrect: 'Правильно',
    peekWrong: 'Неправильно',
    peekAffordance: 'Посмотреть под плиткой',
    /** Solo infinite budgets modal (SC-PRESENCE-19). */
    soloUnlimitedModal:
      'Вы один в игре. Шаги и просмотры безлимитны, просмотры плиток не ограничены за ход.',
    soloUnlimitedModalOk: 'ОК',
  },
};
