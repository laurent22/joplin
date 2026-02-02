import { getDatabase, FolderEntity } from './database';
import { Folder } from './folder';

// APIレスポンスの型定義
export interface FolderListResponse {
  id: string;
  title: string;
  parent_id: string;
  updated_time: number;
  created_time: number;
}

export interface SuccessResponse {
  success: true;
  data: FolderTreeNode[];
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
}

// ツリー構造のフォルダ型定義
export interface FolderTreeNode extends FolderListResponse {
  children: FolderTreeNode[];
}

export class ViewerUtil {

  public static selectFolderDataAndCreateTree(): FolderTreeNode[] {
    // データベースから全てのフォルダ情報を取得
    const folders = Folder.getAllFolders();

    // レスポンス用にデータを整形
    const folderList: FolderListResponse[] = folders.map(folder => ({
      id: folder.id || '',
      title: folder.title || '',
      parent_id: folder.parent_id || '',
      updated_time: folder.updated_time || 0,
      created_time: folder.created_time || 0,
    }));

    const folderTree = ViewerUtil.createFolderTree(folderList);
    return folderTree;
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
    folders.forEach(folder => {
      folderMap.set(folder.id, {
        ...folder,
        children: []
      });
    });

    // ルートノード（parent_idが空のフォルダ）を格納する配列
    const rootNodes: FolderTreeNode[] = [];

    // 各フォルダを親子関係に基づいてツリー構造に配置
    folders.forEach(folder => {
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
    const sortByTitle = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
      return nodes
        .sort((a, b) => a.title.localeCompare(b.title))
        .map(node => ({
          ...node,
          children: sortByTitle(node.children)
        }));
    };

    return sortByTitle(rootNodes);
  }
}




