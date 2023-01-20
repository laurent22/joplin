"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.down = exports.up = void 0;
function up(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.schema.alterTable('users', function (table) {
            table.integer('email_confirmed').defaultTo(0).notNullable();
            table.integer('must_set_password').defaultTo(0).notNullable();
        });
        yield db.schema.createTable('emails', function (table) {
            table.increments('id').unique().primary().notNullable();
            table.text('recipient_name', 'mediumtext').defaultTo('').notNullable();
            table.text('recipient_email', 'mediumtext').defaultTo('').notNullable();
            table.string('recipient_id', 32).defaultTo(0).notNullable();
            table.integer('sender_id').notNullable();
            table.string('subject', 128).notNullable();
            table.text('body').notNullable();
            table.bigInteger('sent_time').defaultTo(0).notNullable();
            table.integer('sent_success').defaultTo(0).notNullable();
            table.text('error').defaultTo('').notNullable();
            table.bigInteger('updated_time').notNullable();
            table.bigInteger('created_time').notNullable();
        });
        yield db.schema.createTable('tokens', function (table) {
            table.increments('id').unique().primary().notNullable();
            table.string('value', 32).notNullable();
            table.string('user_id', 32).defaultTo('').notNullable();
            table.bigInteger('updated_time').notNullable();
            table.bigInteger('created_time').notNullable();
        });
        yield db.schema.alterTable('emails', function (table) {
            table.index(['sent_time']);
            table.index(['sent_success']);
        });
        yield db('users').update({ email_confirmed: 1 });
        yield db.schema.alterTable('tokens', function (table) {
            table.index(['value', 'user_id']);
        });
    });
}
exports.up = up;
function down(_db) {
    return __awaiter(this, void 0, void 0, function* () {
    });
}
exports.down = down;
//# sourceMappingURL=20210518172311_mailer.js.map