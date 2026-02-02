/**
 * jpnkn → わんコメ 変換ロジックのユニットテスト
 * 
 * 本テストは docs/jpnkn-api-spec.md および docs/schema-jpnkn.json を
 * 「正解」として、変換ロジックが仕様に準拠していることを検証します。
 */

import { transformJpnknToOneComme, parsePayload, shouldProcessMessage } from '../dist/src/transform.js';

describe('transformJpnknToOneComme', () => {
  const defaultOptions = { serviceId: 'test-service-id' };

  describe('基本的なマッピング', () => {
    test('jpnknのidがわんコメのuserIdにマッピングされる', () => {
      const jpnknPayload = {
        board: 'news',
        thread: '12345',
        num: 100,
        id: 'ABC123',
        name: 'テスト太郎',
        message: 'これはテストメッセージです',
        is_new: true
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.userId).toBe('ABC123');
    });

    test('jpnknのmessageがわんコメのcommentにマッピングされる', () => {
      const jpnknPayload = {
        board: 'news',
        thread: '12345',
        num: 100,
        id: 'ABC123',
        name: 'テスト太郎',
        message: 'これはテストメッセージです',
        is_new: true
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.comment).toBe('これはテストメッセージです');
    });

    test('jpnknのnameがわんコメのnameにマッピングされる', () => {
      const jpnknPayload = {
        board: 'test',
        thread: '999',
        num: 1,
        id: 'USER001',
        name: '投稿者名',
        message: 'テスト',
        is_new: true
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.name).toBe('投稿者名');
    });
  });

  describe('複数パターンのidマッピングテスト', () => {
    test('英数字のidが正しくマッピングされる', () => {
      const jpnknPayload = {
        board: 'board1',
        thread: 'thread1',
        num: 1,
        id: 'XyZ789AbC',
        message: 'test',
        is_new: true
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);
      expect(result.comment.userId).toBe('XyZ789AbC');
    });

    test('日本語を含むidが正しくマッピングされる', () => {
      const jpnknPayload = {
        board: 'board1',
        thread: 'thread1',
        num: 1,
        id: 'ユーザー123',
        message: 'test',
        is_new: true
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);
      expect(result.comment.userId).toBe('ユーザー123');
    });

    test('特殊文字を含むidが正しくマッピングされる', () => {
      const jpnknPayload = {
        board: 'board1',
        thread: 'thread1',
        num: 1,
        id: 'user_@#$%',
        message: 'test',
        is_new: true
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);
      expect(result.comment.userId).toBe('user_@#$%');
    });

    test('idが未定義の場合はデフォルト値が使用される', () => {
      const jpnknPayload = {
        board: 'board1',
        thread: 'thread1',
        num: 1,
        message: 'test',
        is_new: true
        // id is not provided
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);
      expect(result.comment.userId).toBe('jpnkn:anonymous');
    });
  });

  describe('複数パターンのmessageマッピングテスト', () => {
    test('通常のテキストメッセージが正しくマッピングされる', () => {
      const jpnknPayload = {
        board: 'test',
        thread: '123',
        num: 1,
        message: 'Hello, World!',
        is_new: true
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);
      expect(result.comment.comment).toBe('Hello, World!');
    });

    test('マルチバイト文字（日本語）が正しくマッピングされる', () => {
      const jpnknPayload = {
        board: 'test',
        thread: '123',
        num: 1,
        message: 'こんにちは、世界！これは日本語のテストです。',
        is_new: true
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);
      expect(result.comment.comment).toBe('こんにちは、世界！これは日本語のテストです。');
    });

    test('改行を含むメッセージが正しくマッピングされる', () => {
      const jpnknPayload = {
        board: 'test',
        thread: '123',
        num: 1,
        message: '1行目\n2行目\n3行目',
        is_new: true
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);
      expect(result.comment.comment).toBe('1行目\n2行目\n3行目');
    });

    test('HTMLタグを含むメッセージがそのままマッピングされる', () => {
      const jpnknPayload = {
        board: 'test',
        thread: '123',
        num: 1,
        message: '<b>太字</b>と<a href="#">リンク</a>',
        is_new: true
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);
      expect(result.comment.comment).toBe('<b>太字</b>と<a href="#">リンク</a>');
    });

    test('空文字列のメッセージもマッピングされる', () => {
      const jpnknPayload = {
        board: 'test',
        thread: '123',
        num: 1,
        message: '',
        is_new: true
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);
      expect(result.comment.comment).toBe('');
    });

    test('長いメッセージが正しくマッピングされる', () => {
      const longMessage = 'あ'.repeat(1000);
      const jpnknPayload = {
        board: 'test',
        thread: '123',
        num: 1,
        message: longMessage,
        is_new: true
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);
      expect(result.comment.comment).toBe(longMessage);
      expect(result.comment.comment.length).toBe(1000);
    });
  });

  describe('service.idの生成', () => {
    test('指定されたserviceIdがservice.idにセットされる', () => {
      const jpnknPayload = {
        board: 'test',
        thread: '123',
        num: 1,
        message: 'test',
        is_new: true
      };

      const result = transformJpnknToOneComme(jpnknPayload, { serviceId: 'my-custom-service' });

      expect(result.service.id).toBe('my-custom-service');
    });
  });

  describe('comment.idの生成', () => {
    test('board, thread, numが揃っている場合は一意のIDが生成される', () => {
      const jpnknPayload = {
        board: 'news',
        thread: '99999',
        num: 42,
        message: 'test',
        is_new: true
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.id).toBe('jpnkn:news:99999:42');
    });

    test('numが0の場合も正しくIDが生成される', () => {
      const jpnknPayload = {
        board: 'test',
        thread: '123',
        num: 0,
        message: 'test',
        is_new: true
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      expect(result.comment.id).toBe('jpnkn:test:123:0');
    });
  });

  describe('エラーハンドリング', () => {
    test('serviceIdが未指定の場合はエラーをスローする', () => {
      const jpnknPayload = {
        board: 'test',
        thread: '123',
        num: 1,
        message: 'test',
        is_new: true
      };

      expect(() => transformJpnknToOneComme(jpnknPayload, {})).toThrow('serviceId is required');
    });

    test('messageが未定義の場合はエラーをスローする', () => {
      const jpnknPayload = {
        board: 'test',
        thread: '123',
        num: 1,
        is_new: true
        // message is missing
      };

      expect(() => transformJpnknToOneComme(jpnknPayload, defaultOptions)).toThrow('message is required');
    });

    test('nullペイロードの場合はエラーをスローする', () => {
      expect(() => transformJpnknToOneComme(null, defaultOptions)).toThrow('Invalid jpnkn payload');
    });

    test('undefinedペイロードの場合はエラーをスローする', () => {
      expect(() => transformJpnknToOneComme(undefined, defaultOptions)).toThrow('Invalid jpnkn payload');
    });
  });

  describe('出力形式の検証', () => {
    test('出力がわんコメAPIスキーマに準拠している', () => {
      const jpnknPayload = {
        board: 'news',
        thread: '12345',
        num: 100,
        name: 'テスター',
        mail: 'sage',
        date: '2026/02/02 12:00:00',
        id: 'ABCD1234',
        message: 'テストメッセージです',
        is_new: true
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);

      // service オブジェクトの検証
      expect(result).toHaveProperty('service');
      expect(result.service).toHaveProperty('id');
      expect(typeof result.service.id).toBe('string');

      // comment オブジェクトの検証
      expect(result).toHaveProperty('comment');
      expect(result.comment).toHaveProperty('id');
      expect(result.comment).toHaveProperty('userId');
      expect(result.comment).toHaveProperty('name');
      expect(result.comment).toHaveProperty('comment');
      expect(typeof result.comment.id).toBe('string');
      expect(typeof result.comment.userId).toBe('string');
      expect(typeof result.comment.name).toBe('string');
      expect(typeof result.comment.comment).toBe('string');
    });
  });
});

describe('parsePayload', () => {
  test('JSON形式のペイロードが正しくパースされる', () => {
    const raw = JSON.stringify({
      num: 123,
      name: '名無しさん',
      message: 'テストです'
    });

    const result = parsePayload(raw);

    expect(result).toBe('No.123 名無しさん > テストです');
  });

  test('numがない場合はNo.を省略する', () => {
    const raw = JSON.stringify({
      name: '名無しさん',
      message: 'テストです'
    });

    const result = parsePayload(raw);

    expect(result).toBe('名無しさん > テストです');
  });

  test('nameがない場合は名前部分を省略する', () => {
    const raw = JSON.stringify({
      num: 123,
      message: 'テストです'
    });

    const result = parsePayload(raw);

    expect(result).toBe('No.123 テストです');
  });

  test('無効なJSONの場合は元のテキストを返す', () => {
    const raw = 'これはプレーンテキストです';

    const result = parsePayload(raw);

    expect(result).toBe('これはプレーンテキストです');
  });
});

/**
 * jpnkn-api-spec.md 準拠テスト
 * 
 * 以下の仕様に準拠していることを検証:
 * - フィールド名: num (not no), message (not msg)
 * - is_new: true のメッセージのみを処理対象とする
 */
describe('jpnkn-api-spec.md 準拠テスト', () => {
  describe('フィールド名の準拠', () => {
    test('parsePayloadはjpnkn仕様のnumフィールドを使用する', () => {
      // jpnkn-api-spec.md: "num": レス番号（integer）
      const jpnknPayload = {
        board: 'news',
        thread: '12345',
        num: 42,  // 正しいフィールド名
        name: 'テスター',
        message: 'テストメッセージ',
        is_new: true
      };

      const result = parsePayload(JSON.stringify(jpnknPayload));
      expect(result).toBe('No.42 テスター > テストメッセージ');
    });

    test('parsePayloadは旧フィールド名noを使用しない', () => {
      // 旧フィールド名noは無視されるべき
      const oldStylePayload = {
        no: 99,  // 旧フィールド名（仕様外）
        name: 'テスター',
        message: 'テストメッセージ'
      };

      const result = parsePayload(JSON.stringify(oldStylePayload));
      // numがないのでNo.は表示されない
      expect(result).toBe('テスター > テストメッセージ');
      expect(result).not.toContain('No.99');
    });

    test('parsePayloadはjpnkn仕様のmessageフィールドを使用する', () => {
      // jpnkn-api-spec.md: "message": レス本文（string）
      const jpnknPayload = {
        num: 1,
        message: '正しいメッセージ'  // 正しいフィールド名
      };

      const result = parsePayload(JSON.stringify(jpnknPayload));
      expect(result).toContain('正しいメッセージ');
    });

    test('parsePayloadは旧フィールド名msgを使用しない', () => {
      // 旧フィールド名msgは無視されるべき
      const oldStylePayload = {
        num: 1,
        msg: '旧形式メッセージ'  // 旧フィールド名（仕様外）
      };

      const result = parsePayload(JSON.stringify(oldStylePayload));
      // messageがないので元のJSONがそのまま返される
      expect(result).not.toBe('No.1 旧形式メッセージ');
    });
  });

  describe('is_new フィルタリング（実装上の注意点）', () => {
    test('is_new: true のメッセージは処理対象', () => {
      const payload = JSON.stringify({
        board: 'news',
        thread: '12345',
        num: 1,
        message: 'テスト',
        is_new: true
      });

      expect(shouldProcessMessage(payload)).toBe(true);
    });

    test('is_new: false のメッセージは処理対象外', () => {
      // jpnkn-api-spec.md: is_new: true のメッセージを対象として処理を行う
      const payload = JSON.stringify({
        board: 'news',
        thread: '12345',
        num: 1,
        message: 'テスト',
        is_new: false
      });

      expect(shouldProcessMessage(payload)).toBe(false);
    });

    test('is_new が未定義の場合は処理対象（デフォルトtrue扱い）', () => {
      const payload = JSON.stringify({
        board: 'news',
        thread: '12345',
        num: 1,
        message: 'テスト'
        // is_new is not defined
      });

      expect(shouldProcessMessage(payload)).toBe(true);
    });

    test('JSONでないプレーンテキストは処理対象', () => {
      const plainText = 'これはプレーンテキストです';
      expect(shouldProcessMessage(plainText)).toBe(true);
    });
  });

  describe('schema-jpnkn.json 必須フィールドの検証', () => {
    // schema-jpnkn.json: required: ["board", "thread", "num", "message", "is_new"]
    
    test('必須フィールドがすべて揃ったペイロードを正しく処理', () => {
      const completePayload = {
        board: 'news',
        thread: '1234567890',
        num: 100,
        message: 'テストメッセージです',
        is_new: true
      };

      const result = transformJpnknToOneComme(completePayload, { serviceId: 'test' });
      
      expect(result.comment.id).toBe('jpnkn:news:1234567890:100');
      expect(result.comment.comment).toBe('テストメッセージです');
    });

    test('オプションフィールド（name, id, mail, date）がなくても動作', () => {
      // schema-jpnkn.json では name, id, mail, date は required ではない
      const minimalPayload = {
        board: 'test',
        thread: '999',
        num: 1,
        message: 'minimal message',
        is_new: true
      };

      const result = transformJpnknToOneComme(minimalPayload, { serviceId: 'test' });
      
      expect(result.comment.comment).toBe('minimal message');
      expect(result.comment.name).toBe('名無し');  // デフォルト値
      expect(result.comment.userId).toBe('jpnkn:anonymous');  // デフォルト値
    });
  });

  describe('schema-onecomme.json 出力形式の検証', () => {
    // schema-onecomme.json: service.id, comment.id, userId, name, comment が必須
    
    test('出力にservice.idが含まれる', () => {
      const payload = {
        board: 'test', thread: '1', num: 1, message: 'test', is_new: true
      };
      const result = transformJpnknToOneComme(payload, { serviceId: 'my-service' });
      
      expect(result.service).toBeDefined();
      expect(result.service.id).toBe('my-service');
    });

    test('出力にcomment必須フィールドがすべて含まれる', () => {
      const payload = {
        board: 'test', thread: '1', num: 1, message: 'test message', 
        name: 'tester', id: 'USER123', is_new: true
      };
      const result = transformJpnknToOneComme(payload, { serviceId: 'test' });
      
      expect(result.comment.id).toBeDefined();
      expect(typeof result.comment.id).toBe('string');
      expect(result.comment.userId).toBe('USER123');
      expect(result.comment.name).toBe('tester');
      expect(result.comment.comment).toBe('test message');
    });
  });
});
