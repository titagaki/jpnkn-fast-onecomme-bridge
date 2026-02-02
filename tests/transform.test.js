/**
 * jpnkn → わんコメ 変換ロジックのユニットテスト
 */

import { transformJpnknToOneComme, parsePayload, splitForTTS } from '../src/transform.js';

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

    test('authorUserIdオプションが指定された場合はそちらが優先される', () => {
      const jpnknPayload = {
        board: 'board1',
        thread: 'thread1',
        num: 1,
        id: 'original-id',
        message: 'test',
        is_new: true
      };

      const options = {
        serviceId: 'test-service',
        authorUserId: 'custom-user-id'
      };

      const result = transformJpnknToOneComme(jpnknPayload, options);
      expect(result.comment.userId).toBe('custom-user-id');
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

  describe('is_newフラグの処理', () => {
    test('is_new: trueが正しく伝播する', () => {
      const jpnknPayload = {
        board: 'test',
        thread: '123',
        num: 1,
        message: 'test',
        is_new: true
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);
      expect(result.comment.is_new).toBe(true);
    });

    test('is_new: falseが正しく伝播する', () => {
      const jpnknPayload = {
        board: 'test',
        thread: '123',
        num: 1,
        message: 'test',
        is_new: false
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);
      expect(result.comment.is_new).toBe(false);
    });

    test('is_newが未定義の場合はtrueになる', () => {
      const jpnknPayload = {
        board: 'test',
        thread: '123',
        num: 1,
        message: 'test'
        // is_new not provided
      };

      const result = transformJpnknToOneComme(jpnknPayload, defaultOptions);
      expect(result.comment.is_new).toBe(true);
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

describe('splitForTTS', () => {
  test('句点で分割される', () => {
    const text = 'これは1文目です。これは2文目です。';

    const result = splitForTTS(text, 100);

    expect(result).toEqual(['これは1文目です。', 'これは2文目です。']);
  });

  test('指定サイズを超える場合は分割される', () => {
    const text = 'あ'.repeat(30);

    const result = splitForTTS(text, 10);

    expect(result.length).toBe(3);
    expect(result[0].length).toBe(10);
    expect(result[1].length).toBe(10);
    expect(result[2].length).toBe(10);
  });

  test('空文字列の場合は元の空文字列を返す', () => {
    const result = splitForTTS('', 100);

    expect(result).toEqual(['']);
  });
});
