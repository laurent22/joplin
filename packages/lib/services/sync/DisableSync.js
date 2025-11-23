"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Setting_1 = require("../../models/Setting");
class DisableSync {
  /**
   * Desabilita a sincronização definindo sync.target como 0 (None)
   * e ocultando o prompt de Joplin Cloud
   */
  static async disableSync() {
    // Definir sync target como 0 (desabilitado)
    Setting_1.default.setValue("sync.target", 0);
    // NOVA FUNCIONALIDADE: Desabilitar prompt de sugestão do Joplin Cloud
    Setting_1.default.setValue("sync.showPrompt", false);
    // CYCLE 3 RED PHASE: SEM Setting.saveAll() - teste deve FALHAR
    // await Setting.saveAll();
  }
  /**
   * Verifica se a sincronização está desabilitada
   * @returns true se sync.target é 0 (None)
   */
  static isSyncDisabled() {
    return Setting_1.default.value("sync.target") === 0;
  }
  /**
   * Verifica se o prompt está desabilitado
   * @returns true se sync.showPrompt é false
   */
  static isPromptDisabled() {
    return Setting_1.default.value("sync.showPrompt") === false;
  }
}
exports.default = DisableSync;
//# sourceMappingURL=DisableSync.js.map
