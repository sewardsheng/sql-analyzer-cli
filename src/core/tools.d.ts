/**
 * 工具模块类型声明
 */

export declare function createTool(type: string, llmService: any, options?: any): any;
export declare class ToolFactory {
  constructor(llmService: any, knowledgeBase: any, options: any);
  updateConfig(config: any): void;
  clearCache(): void;
}
export declare function sortToolsByPriority(types: string[]): string[];