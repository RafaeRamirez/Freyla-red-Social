import { Injectable } from '@angular/core';
import { global } from './global';

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  public url: string;

  constructor() {
    this.url = global.url;
  }

  makeFileRequest(
    url: string,
    params: string[],
    files: File[],
    token: string,
    name = 'image'
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      const xhr = new XMLHttpRequest();

      for (let i = 0; i < files.length; i += 1) {
        formData.append(name, files[i], files[i].name);
      }

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) {
          return;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(xhr.responseText);
          }
          return;
        }

        reject(xhr.responseText);
      };

      xhr.open('POST', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  }
}
