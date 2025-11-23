"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_utils_1 = require("../../testing/test-utils");
const Setting_1 = require("../../models/Setting");
const DisableSync_1 = require("./DisableSync");
describe("DisableSync service", () => {
  beforeEach(async () => {
    await (0, test_utils_1.setupDatabaseAndSynchronizer)(1);
    await (0, test_utils_1.switchClient)(1);
    // Resetar configurações para estado inicial
    Setting_1.default.setValue("sync.target", 7); // Joplin Cloud
    Setting_1.default.setValue("sync.showPrompt", true);
  });
  describe("Cycle 1 TDD", () => {
    it("should change sync.target to 0 when disabling sync", async () => {
      // Arrange: Verificar estado inicial
      expect(Setting_1.default.value("sync.target")).toBe(7);
      // Act: Desabilitar sincronização
      await DisableSync_1.default.disableSync();
      // Assert: Verificar que sync.target foi alterado para 0
      expect(Setting_1.default.value("sync.target")).toBe(0);
    });
  });
  describe("Cycle 2 TDD", () => {
    it("should change sync.showPrompt to false when disabling sync", async () => {
      // Arrange: Verificar estado inicial
      expect(Setting_1.default.value("sync.showPrompt")).toBe(true);
      // Act: Desabilitar sincronização
      await DisableSync_1.default.disableSync();
      // Assert: Verificar que sync.showPrompt foi alterado para false
      expect(Setting_1.default.value("sync.showPrompt")).toBe(false);
    });
  });
  describe("Helper Methods", () => {
    it("should correctly identify when sync is disabled", () => {
      // Arrange: Configurar sync ativo (alvo diferente de 0)
      Setting_1.default.setValue("sync.target", 7);
      expect(DisableSync_1.default.isSyncDisabled()).toBe(false);
      // Act: Desabilitar sync
      Setting_1.default.setValue("sync.target", 0);
      // Assert: Verificar que método identifica corretamente
      expect(DisableSync_1.default.isSyncDisabled()).toBe(true);
    });
    it("should correctly identify when prompt is disabled", () => {
      // Arrange: Configurar prompt ativo
      Setting_1.default.setValue("sync.showPrompt", true);
      expect(DisableSync_1.default.isPromptDisabled()).toBe(false);
      // Act: Desabilitar prompt
      Setting_1.default.setValue("sync.showPrompt", false);
      // Assert: Verificar que método identifica corretamente
      expect(DisableSync_1.default.isPromptDisabled()).toBe(true);
    });
  });
  // CICLO 3 TDD - RED: Este teste deve FALHAR inicialmente
  describe("Cycle 3 TDD - Persistence", () => {
    it("should persist disabled sync settings between application restarts", async () => {
      // Arrange: Configurar sincronização ativa
      Setting_1.default.setValue("sync.target", 7); // Joplin Cloud
      Setting_1.default.setValue("sync.showPrompt", true);
      expect(Setting_1.default.value("sync.target")).toBe(7);
      expect(Setting_1.default.value("sync.showPrompt")).toBe(true);
      // Act 1: Desabilitar sincronização
      await DisableSync_1.default.disableSync();
      expect(Setting_1.default.value("sync.target")).toBe(0);
      expect(Setting_1.default.value("sync.showPrompt")).toBe(false);
      // Act 2: Simular reinicialização da aplicação (reload settings)
      await Setting_1.default.reset();
      await Setting_1.default.load();
      // Assert: Verificar que as configurações persistiram após reload
      // ESTE TESTE DEVE FALHAR porque não chamamos Setting.saveAll()
      expect(Setting_1.default.value("sync.target")).toBe(0);
      expect(Setting_1.default.value("sync.showPrompt")).toBe(false);
      expect(DisableSync_1.default.isSyncDisabled()).toBe(true);
      expect(DisableSync_1.default.isPromptDisabled()).toBe(true);
    });
  });
});
//# sourceMappingURL=DisableSync.test.js.map
