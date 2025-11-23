// DisableSync Test Suite - Demonstração Completa TDD
// 4 testes PASSAM, 1 teste FALHA (Cycle 3 - RED phase)

const mockSetting = {
  values: {},

  setValue(key, value) {
    this.values[key] = value;
  },

  value(key) {
    return this.values[key];
  },

  reset() {
    this.values = {};
  },

  async load() {
    // Simula carregar do "banco de dados" - sem persistência real
    console.log("📁 Loading from database... (no persistence implemented)");
  },

  async saveAll() {
    // Implementação vazia para demonstrar que não persiste
    console.log("💾 Saving to database... (not implemented yet)");
  },
};

class DisableSync {
  static async disableSync() {
    mockSetting.setValue("sync.target", 0);
    mockSetting.setValue("sync.showPrompt", false);
    // CYCLE 3: Ainda SEM mockSetting.saveAll() para demonstrar RED phase
  }

  static isSyncDisabled() {
    return mockSetting.value("sync.target") === 0;
  }

  static isPromptDisabled() {
    return mockSetting.value("sync.showPrompt") === false;
  }
}

// Framework de teste simples
let testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

function expect(actual) {
  return {
    toBe: (expected) => {
      const passed = actual === expected;
      return { passed, actual, expected };
    },
  };
}

function it(description, testFn) {
  console.log(`\n🧪 ${description}`);
  try {
    const result = testFn();
    if (result && typeof result.then === "function") {
      return result
        .then(() => {
          console.log("✅ PASSED");
          testResults.passed++;
          testResults.tests.push({ description, status: "PASSED" });
        })
        .catch((error) => {
          console.log(`❌ FAILED: ${error.message}`);
          testResults.failed++;
          testResults.tests.push({
            description,
            status: "FAILED",
            error: error.message,
          });
        });
    } else {
      console.log("✅ PASSED");
      testResults.passed++;
      testResults.tests.push({ description, status: "PASSED" });
    }
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
    testResults.failed++;
    testResults.tests.push({
      description,
      status: "FAILED",
      error: error.message,
    });
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Setup para cada teste
function beforeEach() {
  mockSetting.setValue("sync.target", 7); // Joplin Cloud
  mockSetting.setValue("sync.showPrompt", true);
}

async function runAllTests() {
  console.log("🚀 DISABLE SYNC SERVICE - TDD TEST SUITE");
  console.log("========================================");

  // Cycle 1 TDD
  console.log("\n📋 CYCLE 1 TDD - sync.target functionality");
  console.log("─────────────────────────────────────────");

  beforeEach();
  await it("should change sync.target to 0 when disabling sync", async () => {
    // Arrange: Verificar estado inicial
    const initialTarget = mockSetting.value("sync.target");
    assert(
      initialTarget === 7,
      `Expected initial sync.target to be 7, got ${initialTarget}`
    );

    // Act: Desabilitar sincronização
    await DisableSync.disableSync();

    // Assert: Verificar que sync.target foi alterado para 0
    const finalTarget = mockSetting.value("sync.target");
    assert(
      finalTarget === 0,
      `Expected sync.target to be 0, got ${finalTarget}`
    );
  });

  // Cycle 2 TDD
  console.log("\n📋 CYCLE 2 TDD - sync.showPrompt functionality");
  console.log("──────────────────────────────────────────────");

  beforeEach();
  await it("should change sync.showPrompt to false when disabling sync", async () => {
    // Arrange: Verificar estado inicial
    const initialPrompt = mockSetting.value("sync.showPrompt");
    assert(
      initialPrompt === true,
      `Expected initial sync.showPrompt to be true, got ${initialPrompt}`
    );

    // Act: Desabilitar sincronização
    await DisableSync.disableSync();

    // Assert: Verificar que sync.showPrompt foi alterado para false
    const finalPrompt = mockSetting.value("sync.showPrompt");
    assert(
      finalPrompt === false,
      `Expected sync.showPrompt to be false, got ${finalPrompt}`
    );
  });

  // Helper Methods
  console.log("\n📋 HELPER METHODS - Utility functions");
  console.log("────────────────────────────────────");

  beforeEach();
  await it("should correctly identify when sync is disabled", () => {
    // Arrange: Configurar sync ativo (alvo diferente de 0)
    mockSetting.setValue("sync.target", 7);
    const activeSync = DisableSync.isSyncDisabled();
    assert(
      activeSync === false,
      `Expected isSyncDisabled() to be false when sync.target is 7, got ${activeSync}`
    );

    // Act: Desabilitar sync
    mockSetting.setValue("sync.target", 0);

    // Assert: Verificar que método identifica corretamente
    const disabledSync = DisableSync.isSyncDisabled();
    assert(
      disabledSync === true,
      `Expected isSyncDisabled() to be true when sync.target is 0, got ${disabledSync}`
    );
  });

  beforeEach();
  await it("should correctly identify when prompt is disabled", () => {
    // Arrange: Configurar prompt ativo
    mockSetting.setValue("sync.showPrompt", true);
    const activePrompt = DisableSync.isPromptDisabled();
    assert(
      activePrompt === false,
      `Expected isPromptDisabled() to be false when sync.showPrompt is true, got ${activePrompt}`
    );

    // Act: Desabilitar prompt
    mockSetting.setValue("sync.showPrompt", false);

    // Assert: Verificar que método identifica corretamente
    const disabledPrompt = DisableSync.isPromptDisabled();
    assert(
      disabledPrompt === true,
      `Expected isPromptDisabled() to be true when sync.showPrompt is false, got ${disabledPrompt}`
    );
  });

  // Cycle 3 TDD - RED phase (deve FALHAR)
  console.log("\n📋 CYCLE 3 TDD - PERSISTENCE (RED PHASE - DEVE FALHAR)");
  console.log("───────────────────────────────────────────────────────");

  beforeEach();
  await it("should persist disabled sync settings between application restarts", async () => {
    // Arrange: Configurar sincronização ativa
    mockSetting.setValue("sync.target", 7); // Joplin Cloud
    mockSetting.setValue("sync.showPrompt", true);

    const initialTarget = mockSetting.value("sync.target");
    const initialPrompt = mockSetting.value("sync.showPrompt");
    assert(
      initialTarget === 7,
      `Expected initial sync.target to be 7, got ${initialTarget}`
    );
    assert(
      initialPrompt === true,
      `Expected initial sync.showPrompt to be true, got ${initialPrompt}`
    );

    // Act 1: Desabilitar sincronização
    await DisableSync.disableSync();
    const disabledTarget = mockSetting.value("sync.target");
    const disabledPrompt = mockSetting.value("sync.showPrompt");
    assert(
      disabledTarget === 0,
      `Expected sync.target to be 0 after disabling, got ${disabledTarget}`
    );
    assert(
      disabledPrompt === false,
      `Expected sync.showPrompt to be false after disabling, got ${disabledPrompt}`
    );

    // Act 2: Simular reinicialização da aplicação (reload settings)
    console.log("🔄 Simulating application restart...");
    await mockSetting.reset();
    await mockSetting.load();

    // Assert: Verificar que as configurações persistiram após reload
    // ESTE TESTE DEVE FALHAR porque não chamamos Setting.saveAll()
    const persistedTarget = mockSetting.value("sync.target");
    const persistedPrompt = mockSetting.value("sync.showPrompt");

    console.log(
      `📋 Persistence check: sync.target = ${persistedTarget}, sync.showPrompt = ${persistedPrompt}`
    );

    assert(
      persistedTarget === 0,
      `Expected sync.target to persist as 0, got ${persistedTarget}`
    );
    assert(
      persistedPrompt === false,
      `Expected sync.showPrompt to persist as false, got ${persistedPrompt}`
    );
    assert(
      DisableSync.isSyncDisabled() === true,
      `Expected isSyncDisabled() to be true after restart`
    );
    assert(
      DisableSync.isPromptDisabled() === true,
      `Expected isPromptDisabled() to be true after restart`
    );
  });

  // Resumo dos resultados
  console.log("\n🏆 TEST SUMMARY");
  console.log("══════════════");
  console.log(`✅ Tests Passed: ${testResults.passed}`);
  console.log(`❌ Tests Failed: ${testResults.failed}`);
  console.log(`📊 Total Tests: ${testResults.passed + testResults.failed}`);

  console.log("\n📝 DETAILED RESULTS:");
  testResults.tests.forEach((test, index) => {
    const status = test.status === "PASSED" ? "✅" : "❌";
    console.log(`${index + 1}. ${status} ${test.description}`);
    if (test.error) {
      console.log(`   └─ Error: ${test.error}`);
    }
  });

  console.log("\n🔍 TDD ANALYSIS:");
  console.log("• Cycles 1-2: ✅ COMPLETED (GREEN phase)");
  console.log("• Helper Methods: ✅ COMPLETED (REFACTOR phase)");
  console.log("• Cycle 3: ❌ RED PHASE (as expected)");
  console.log(
    "• Next Step: Implement Setting.saveAll() in disableSync() for GREEN phase"
  );

  return testResults;
}

// Executar todos os testes
runAllTests().catch(console.error);
