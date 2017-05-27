<?php

echo (new Api())->response();

class Api
{
	const DIR = "radars";

	private $request;

	private $source;
	private $releaseDir;

	public $current;
	public $keepReleases = 10;


	public function __construct()
	{
		$this->request = explode('/', trim($_SERVER['PATH_INFO'], '/'));
		if (!isset($this->request[0])) {
			die('Required a source');
		}

		$this->source = realpath(self::DIR . DIRECTORY_SEPARATOR . array_shift($this->request));
		$this->releaseDir = $this->source . "/releases";
		if (!file_exists($this->releaseDir)) {
			mkdir($this->releaseDir, 0777, true);
		}

		$this->current = $this->source . "/current.json";
	}

	function __destruct()
	{
		$this->clearReleases();
	}

	function response()
	{
		header('Content-Type: application/json');

		$method = $_SERVER['REQUEST_METHOD'];

		try {
			switch ($method) {
				case 'GET':
					return $this->handleGet($this->request);
				case 'PUT':
					http_response_code(501);
					die;
				case 'POST':
					return $this->handlePost($this->request);
				case 'DELETE':
					return $this->handleDelete($this->request);
				default:
					http_response_code(405);
			}
		}
		catch (Throwable $ex) {
			http_response_code(500);
			throw $ex;
		}

		return null;
	}

	/**
	 * @return bool|string
	 */
	private function handleGet(array $keys = [])
	{
		$this->cacheHeader(filemtime($this->current));

		if (empty($keys)) {
			$json = file_get_contents($this->current);
		}
		else {
			$data = $this->getData($keys);
			$json = json_encode($data, JSON_PRETTY_PRINT | JSON_FORCE_OBJECT);
		}

		return $json;
	}

	private function handlePost(array $keys = [])
	{
		$input = json_decode(file_get_contents('php://input'));
		$releasePath = $this->createRelease();

		$this->setData($keys, $input);

		$json = $this->writeData($releasePath);
		$this->publish($releasePath);

		return $json;
	}

	private function handleDelete(array $keys = [])
	{
		$releasePath = $this->createRelease();

		$this->setData($keys, null);

		$json = $this->writeData($releasePath);
		$this->publish($releasePath);

		return $json;
	}

	private $_data;
	private function getData(array $keys = [])
	{
		if ($this->_data == null) {
			$json = file_get_contents($this->current);
			$this->_data = json_decode($json);
		}

		$data = &$this->_data;

		foreach ($keys as $key) {
			$data = &$data->$key;
		}

		return $data;
	}

	private function setData(array $keys = [], $input)
	{
		if (empty($keys)) {
			$this->_data = $input;
		}
		else {
			$data = &$this->getData();
			$last = &$data;

			foreach ($keys as $key) {
				$last = &$data;
				$data = &$data->$key;
			}

			if (is_null($input)) {
				unset($last->{end($keys)});
			}
			else {
				$last->{end($keys)} = $input;
			}
		}
	}

	function cacheHeader($timestamp)
	{
		$lastModifiedDate = gmdate('D, d M Y H:i:s ', $timestamp) . 'GMT';
		$etag = $timestamp;

		$if_none_match = isset($_SERVER['HTTP_IF_NONE_MATCH']) ? $_SERVER['HTTP_IF_NONE_MATCH'] == $etag : false;
		$if_modified_since = isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) ? $_SERVER['HTTP_IF_MODIFIED_SINCE'] >= $lastModifiedDate : false;

		if ($if_none_match || $if_modified_since) {
			header('HTTP/1.1 304 Not Modified');
			exit();
		}
		else {
			$expires = gmdate('D, d M Y H:i:s ', $timestamp + 600) . 'GMT';
			header("Expires: " . $expires); // Date in the future
			header("Last-Modified: $lastModifiedDate");
			header("ETag: \"{$etag}\"");
		}
	}

	function createRelease()
	{
		$releasePath = $this->releaseDir . DIRECTORY_SEPARATOR . date('Y-m-d_His') . '.json';

		return $releasePath;
	}

	function writeData($path)
	{
		$file = fopen($path, "w") or die("Unable to open file!");
		$json = json_encode($this->getData(), JSON_PRETTY_PRINT | JSON_FORCE_OBJECT);

		fwrite($file, $json);
		fclose($file);

		return $json;
	}

	function publish($releasePath)
	{
		@unlink($this->current);
		symlink($releasePath, $this->current);
	}
	function clearReleases()
	{
		$releases = glob($this->releaseDir . "/*");
		$releases = array_slice(array_reverse($releases), $this->keepReleases);

		foreach ($releases as $file) {
			unlink($file);
		}
	}
}
