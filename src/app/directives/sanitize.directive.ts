import { Directive, ElementRef, Input, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Directive({
  selector: '[appSanitize]',
  standalone: true
})
export class SanitizeDirective implements OnInit, OnDestroy {
  @Input() appSanitize: string = '';
  
  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.updateContent();
  }

  ngOnDestroy(): void {
    this.elementRef.nativeElement.innerHTML = '';
  }

  private updateContent(): void {
    if (this.appSanitize) {
      const sanitized = this.sanitizeHtml(this.appSanitize);
      this.elementRef.nativeElement.innerHTML = sanitized;
    }
  }

  private sanitizeHtml(html: string): string {
    const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'code', 'pre'];
    const allowedAttributes = {
      'a': ['href', 'target', 'rel'],
      'code': ['class'],
      'pre': ['class']
    };
    
    // Basic HTML sanitization
    const div = document.createElement('div');
    div.innerHTML = html;
    
    const walker = document.createTreeWalker(
      div,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node: Node) => {
          const element = node as Element;
          const tagName = element.tagName.toLowerCase();
          
          if (!allowedTags.includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Remove dangerous attributes
          const attributes = Array.from(element.attributes);
          attributes.forEach(attr => {
            const allowedAttrs = allowedAttributes[tagName as keyof typeof allowedAttributes];
            if (!allowedAttrs || !allowedAttrs.includes(attr.name)) {
              element.removeAttribute(attr.name);
            }
          });
          
          // Ensure external links have security attributes
          if (tagName === 'a' && element.getAttribute('href')?.startsWith('http')) {
            element.setAttribute('target', '_blank');
            element.setAttribute('rel', 'noopener noreferrer');
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    let node;
    const nodesToRemove: Node[] = [];
    while (node = walker.nextNode()) {
      if (walker.currentNode.nodeType === Node.ELEMENT_NODE) {
        const element = walker.currentNode as Element;
        if (!allowedTags.includes(element.tagName.toLowerCase())) {
          nodesToRemove.push(element);
        }
      }
    }
    
    nodesToRemove.forEach(node => node.remove());
    
    return div.innerHTML;
  }
}