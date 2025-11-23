import {
  setupDatabaseAndSynchronizer,
  switchClient,
} from "../../testing/test-utils";
import Setting from "../../models/Setting";
import DisableSync from "./DisableSync";

describe("DisableSync service", () => {
  beforeEach(async () => {
    await setupDatabaseAndSynchronizer(1);
    await switchClient(1);

    // Resetar configurações para estado inicial
    Setting.setValue("sync.target", 7); // Joplin Cloud
    Setting.setValue("sync.showPrompt", true);
  });

  describe("Cycle 1 TDD", () => {
    it("should change sync.target to 0 when disabling sync", async () => {
      // Arrange: Verificar estado inicial
      expect(Setting.value("sync.target")).toBe(7);

      // Act: Desabilitar sincronização
      await DisableSync.disableSync();

      // Assert: Verificar que sync.target foi alterado para 0
      expect(Setting.value("sync.target")).toBe(0);
    });
  });

  describe("Cycle 2 TDD", () => {
    it("should change sync.showPrompt to false when disabling sync", async () => {
      // Arrange: Verificar estado inicial
      expect(Setting.value("sync.showPrompt")).toBe(true);

      // Act: Desabilitar sincronização
      await DisableSync.disableSync();

      // Assert: Verificar que sync.showPrompt foi alterado para false
      expect(Setting.value("sync.showPrompt")).toBe(false);
    });
  });

  describe("Helper Methods", () => {
    it("should correctly identify when sync is disabled", () => {
      // Arrange: Configurar sync ativo (alvo diferente de 0)
      Setting.setValue("sync.target", 7);
      expect(DisableSync.isSyncDisabled()).toBe(false);

      // Act: Desabilitar sync
      Setting.setValue("sync.target", 0);

      // Assert: Verificar que método identifica corretamente
      expect(DisableSync.isSyncDisabled()).toBe(true);
    });

    it("should correctly identify when prompt is disabled", () => {
      // Arrange: Configurar prompt ativo
      Setting.setValue("sync.showPrompt", true);
      expect(DisableSync.isPromptDisabled()).toBe(false);

      // Act: Desabilitar prompt
      Setting.setValue("sync.showPrompt", false);

      // Assert: Verificar que método identifica corretamente
      expect(DisableSync.isPromptDisabled()).toBe(true);
    });
  });

  // CICLO 3 TDD - RED: Este teste deve FALHAR inicialmente
  describe("Cycle 3 TDD - Persistence", () => {
    it("should persist disabled sync settings between application restarts", async () => {
      // Arrange: Configurar sincronização ativa
      Setting.setValue("sync.target", 7); // Joplin Cloud
      Setting.setValue("sync.showPrompt", true);
      expect(Setting.value("sync.target")).toBe(7);
      expect(Setting.value("sync.showPrompt")).toBe(true);

      // Act 1: Desabilitar sincronização
      await DisableSync.disableSync();
      expect(Setting.value("sync.target")).toBe(0);
      expect(Setting.value("sync.showPrompt")).toBe(false);

      // Act 2: Simular reinicialização da aplicação (reload settings)
      await Setting.reset();
      await Setting.load();

      // Assert: Verificar que as configurações persistiram após reload
      // ESTE TESTE DEVE FALHAR porque não chamamos Setting.saveAll()
      expect(Setting.value("sync.target")).toBe(0);
      expect(Setting.value("sync.showPrompt")).toBe(false);
      expect(DisableSync.isSyncDisabled()).toBe(true);
      expect(DisableSync.isPromptDisabled()).toBe(true);
    });
  });
});
