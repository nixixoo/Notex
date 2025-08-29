import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'safeHtml',
  pure: true,
  standalone: true
})
export class SafeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';
    
    const sanitizedHtml = this.sanitizeContent(value);
    return this.sanitizer.bypassSecurityTrustHtml(sanitizedHtml);
  }

  private sanitizeContent(html: string): string {
    const allowedTags = [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'mark',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'a', 'code', 'pre', 'blockquote',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span', 'div'
    ];
    
    const allowedAttributes = {
      'a': ['href', 'target', 'rel', 'title'],
      'code': ['class'],
      'pre': ['class'],
      'span': ['class'],
      'div': ['class']
    };

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const removeUnsafeTags = (element: Element) => {
      const tagName = element.tagName.toLowerCase();
      
      if (!allowedTags.includes(tagName)) {
        element.replaceWith(...Array.from(element.childNodes));
        return;
      }

      // Remove dangerous attributes
      Array.from(element.attributes).forEach(attr => {
        const attrName = attr.name.toLowerCase();
        const allowedAttrs = allowedAttributes[tagName as keyof typeof allowedAttributes] || [];
        
        if (!allowedAttrs.includes(attrName)) {
          element.removeAttribute(attr.name);
        } else if (attrName === 'href') {
          // Sanitize href attributes
          const href = attr.value;
          if (href.startsWith('javascript:') || href.startsWith('data:') || href.startsWith('vbscript:')) {
            element.removeAttribute('href');
          } else if (href.startsWith('http://') || href.startsWith('https://')) {
            element.setAttribute('target', '_blank');
            element.setAttribute('rel', 'noopener noreferrer');
          }
        }
      });

      // Process child elements
      Array.from(element.children).forEach(child => removeUnsafeTags(child));
    };

    Array.from(tempDiv.children).forEach(child => removeUnsafeTags(child));
    
    return tempDiv.innerHTML;
  }
}