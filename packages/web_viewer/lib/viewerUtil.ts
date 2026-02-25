import { NoteEntity } from './database';
import { Folder } from './folder';
import { Note } from './note';
import * as cheerio from 'cheerio';
import { homedir } from 'os';
import * as path from 'path';

// APIレスポンスの型定義
export interface FolderListResponse {
  id: string;
  title: string;
  parent_id: string;
  updated_time: number;
  created_time: number;
}

export interface NoteTreeNode {
  id: string;
  title: string;
  parent_id: string;
  updated_time: number;
  created_time: number;
  type: 'Note';
  metadata: NoteEntity;
}

export type TreeNode = FolderTreeNode | NoteTreeNode;

// 簡略化されたツリーノードの型定義
export interface SimpleFolderNode {
  id: string;
  title: string;
  type: 'Folder';
  children: SimpleTreeNode[];
}

export interface SimpleNoteNode {
  id: string;
  title: string;
  type: 'Note';
}

export type SimpleTreeNode = SimpleFolderNode | SimpleNoteNode;

export interface SuccessResponse {
  success: true;
  data: TreeNode[];
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
}

// ツリー構造のフォルダ型定義
export interface FolderTreeNode extends FolderListResponse {
  type: 'Folder';
  children: TreeNode[];
}

export class ViewerUtil {
  public static selectFolderDataAndCreateTree(): FolderTreeNode[] {
    // データベースから全てのフォルダ情報を取得
    const folders = Folder.getAllFolders();

    // レスポンス用にデータを整形
    const folderList: FolderListResponse[] = folders.map((folder) => ({
      id: folder.id || '',
      title: folder.title || '',
      parent_id: folder.parent_id || '',
      updated_time: folder.updated_time || 0,
      created_time: folder.created_time || 0,
    }));

    const folderTree = ViewerUtil.createFolderTree(folderList);
    return folderTree;
  }

  public static simpleTreeNode(tree: TreeNode): SimpleTreeNode {
    if (tree.type === 'Note') {
      // Noteの場合は id, title, type のみ
      return {
        id: tree.id,
        title: tree.title,
        type: tree.type,
      };
    } else {
      // Folderの場合は id, title, children のみ（再帰的に処理）
      const folderNode = tree as FolderTreeNode;
      return {
        title: folderNode.title,
        type: folderNode.type as string,
        children: folderNode.children.map((child) => ViewerUtil.simpleTreeNode(child)),
      };
    }
  }

  public static simpleTreeNodes(trees: TreeNode[]): SimpleTreeNode[] {
    return trees.map((tree) => ViewerUtil.simpleTreeNode(tree));
  }

  public static selectFolderAndNotesAndCreateTree() {
    const folderTree = ViewerUtil.createFolderTree(
      // reuse same formatting as selectFolderDataAndCreateTree
      (Folder.getAllFolders() || []).map((folder) => ({
        id: folder.id || '',
        title: folder.title || '',
        parent_id: folder.parent_id || '',
        updated_time: folder.updated_time || 0,
        created_time: folder.created_time || 0,
      }))
    );

    const allNoteMetadata = Note.getAllNotesMetadata();

    // build id map for folders so we can append notes to their parent folder
    const idMap = new Map<string, FolderTreeNode>();
    const traverse = (nodes: FolderTreeNode[]) => {
      for (const node of nodes) {
        idMap.set(node.id, node);
        // only traverse folder children (note nodes won't exist yet)
        node.children.forEach((child) => {
          if ((child as FolderTreeNode).type === 'Folder') {
            traverse([child as FolderTreeNode]);
          }
        });
      }
    };
    traverse(folderTree);

    // attach notes to their parent folder's children
    const rootNodes: TreeNode[] = [...folderTree];

    for (const note of allNoteMetadata) {
      const noteNode: NoteTreeNode = {
        id: note.id,
        title: note.title || '',
        parent_id: note.parent_id || '',
        updated_time: note.updated_time || 0,
        created_time: note.created_time || 0,
        type: 'Note',
        metadata: note,
      };

      if (note.parent_id && idMap.has(note.parent_id)) {
        const parent = idMap.get(note.parent_id)!;
        parent.children.push(noteNode);
      } else {
        // orphan notes go to root
        rootNodes.push(noteNode);
      }
    }

    // sort nodes by title, recursively for folders
    const sortByTitle = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .sort((a, b) => {
          // files (Note) should come before folders
          const ta = a.type;
          const tb = b.type;
          if (ta !== tb) {
            if (ta === 'Note') return -1;
            if (tb === 'Note') return 1;
          }
          return a.title.localeCompare(b.title);
        })
        .map((node) => {
          if ((node as FolderTreeNode).type === 'Folder') {
            const folderNode = node as FolderTreeNode;
            return {
              ...folderNode,
              children: sortByTitle(folderNode.children),
            } as FolderTreeNode;
          }
          return node;
        });
    };

    return sortByTitle(rootNodes);
  }

  /**
   * フラットなフォルダリストから木構造を作成
   * @param folders フォルダのリスト
   * @returns ルートフォルダから始まる木構造
   */
  private static createFolderTree(folders: FolderListResponse[]): FolderTreeNode[] {
    // idをキーとしたマップを作成（高速検索用）
    const folderMap = new Map<string, FolderTreeNode>();

    // 各フォルダをchildrenプロパティ付きのノードに変換してマップに追加
    folders.forEach((folder) => {
      folderMap.set(folder.id, {
        ...folder,
        type: 'Folder',
        children: [] as TreeNode[],
      });
    });

    // ルートノード（parent_idが空のフォルダ）を格納する配列
    const rootNodes: FolderTreeNode[] = [];

    // 各フォルダを親子関係に基づいてツリー構造に配置
    folders.forEach((folder) => {
      const node = folderMap.get(folder.id);
      if (!node) return;

      if (!folder.parent_id || folder.parent_id === '') {
        // parent_idが空の場合はルートノード
        rootNodes.push(node);
      } else {
        // 親フォルダを探して、その子として追加
        const parentNode = folderMap.get(folder.parent_id);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          // 親が見つからない場合はルートとして扱う（孤立フォルダ対策）
          rootNodes.push(node);
        }
      }
    });

    // タイトルでソート（再帰的に）
    const sortByTitle = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .sort((a, b) => {
          // files (Note) should come before folders
          const ta = a.type;
          const tb = b.type;
          if (ta !== tb) {
            if (ta === 'Note') return -1;
            if (tb === 'Note') return 1;
          }
          return a.title.localeCompare(b.title);
        })
        .map((node) => {
          if ((node as FolderTreeNode).type === 'Folder') {
            const folderNode = node as FolderTreeNode;
            return {
              ...folderNode,
              children: sortByTitle(folderNode.children),
            } as FolderTreeNode;
          }
          return node;
        });
    };

    return sortByTitle(rootNodes) as FolderTreeNode[];
  }

  public static getProfileFolderPath(): string {
    // プロファイル名を環境変数から取得（起動スクリプトで設定される）
    const profileName = process.env.PROFILE_NAME || 'joplin_desktop';

    // profileName にスラッシュや不正文字が含まれている可能性があるためサニタイズ
    const safeProfile = path.basename(profileName);

    // プロファイルフォルダのパスを構築
    const profilePath = path.join(homedir(), '.config', safeProfile);
    return profilePath;
  }

  public static getResourceFolderPath(): string {
    const profileFolder = this.getProfileFolderPath();

    // リソースフォルダのパスを構築
    const resourcePath = path.join(profileFolder, 'resources');
    return resourcePath;
  }

  public static getDabaseFilePath(): string {
    const profileFolder = this.getProfileFolderPath();

    // データベースファイルを開く（path.join で適切に結合）
    const dbPath = path.join(profileFolder, 'database.sqlite');
    return dbPath;
  }

  public static getVectorDbFilePath(): string {
    const profileFolder = this.getProfileFolderPath();

    // ベクトルデータベースファイルを開く（path.join で適切に結合）
    const vectorDbPath = path.join(profileFolder, 'vector_db_workspace', `faiss_index`);
    return vectorDbPath;
  }

  private static escapeRegExp(str: string): string {
    return str.replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&');
  }

  public static modifyJoplinResource($: cheerio.Root, resourceDir: string): cheerio.Root {
    const regex = new RegExp(`^${this.escapeRegExp('joplin_resource:/')}`);
    const anchors = $('a[href^="joplin_resource://"]');

    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i] as cheerio.TagElement;
      const href = anchor.attribs.href;
      const newHref = href.replace(regex, resourceDir);
      anchor.attribs.href = newHref;
    }

    const imgs = $('img[src^="joplin_resource://"]');
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i] as cheerio.TagElement;
      const src = img.attribs.src;
      const newSrc = src.replace(regex, resourceDir);
      img.attribs.src = newSrc;
    }

    const videos = $('video[src^="joplin_resource://"]');
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i] as cheerio.TagElement;
      const src = video.attribs.src;
      const newSrc = src.replace(regex, resourceDir);
      video.attribs.src = newSrc;
    }
    return $;
  }

  public static modifyJoplinLinkAnchor($: cheerio.Root): cheerio.Root {
    const joplinAnchors = $('a[href^=joplin://]');
    for (let i = 0; i < joplinAnchors.length; i++) {
      const joplinAnchor = joplinAnchors[i] as cheerio.TagElement;
      const url = URL.parse(joplinAnchor.attribs.href);
      if (!url?.hostname) {
        continue;
      }
      const targetId = url.hostname;
      try {
        joplinAnchor.attribs.href = `/note?note_id=${targetId}`;
      } catch (e) {
        console.log(`error: ${e?.toString()}`);
      }
    }
    return $;
  }

  public static addKatexCssIfNotExists($: cheerio.Root): cheerio.Root {
    const katexCssHref = '/pluginAssets/katex/katex.css';
    const existingLink = $(`link[href="${katexCssHref}"]`);

    if (existingLink.length === 0) {
      // headタグがない場合は作成
      if ($('head').length === 0) {
        $('html').prepend('<head></head>');
      }
      // linkタグを追加
      $('head').append(`<link rel="stylesheet" href="${katexCssHref}">`);
    }

    return $;
  }
}
