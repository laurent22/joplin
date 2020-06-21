export default class WebviewController {

	private key_:string = `webview_${Math.random()}`;

	public html:string = '';

	// TODO: event whenever html prop is modified?

	public get key():string {
		return this.key_;
	}

}
